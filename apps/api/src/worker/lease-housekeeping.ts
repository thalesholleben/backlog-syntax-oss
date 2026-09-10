import type { Pool, PoolClient } from "pg";

const LOCK_KEY = 1_725_903_117;

export function startLeaseHousekeeping(pool: Pool, intervalMs: number): () => void {
  let running = false;
  const sweep = async () => {
    if (running) return;
    running = true;
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      const lock = await client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS acquired",
        [LOCK_KEY],
      );
      if (lock.rows[0]?.acquired) {
        try {
          await client.query("SELECT private.expire_task_leases()");
          await client.query("SELECT private.purge_expired_idempotency_keys(500)");
          await client.query("SELECT private.purge_expired_rate_limits()");
        } finally {
          await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
        }
      }
    } catch (error) {
      console.error("housekeeping_sweep_failed", error);
    } finally {
      client?.release();
      running = false;
    }
  };
  const timer = setInterval(() => void sweep(), intervalMs);
  timer.unref();
  void sweep();
  return () => clearInterval(timer);
}
