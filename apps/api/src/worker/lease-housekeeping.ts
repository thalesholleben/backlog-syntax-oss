import type { Pool, PoolClient } from "pg";

const LOCK_KEY = 1_725_903_117;

/* A session's IP address is retained until the session expires. The row itself stays: deleting
   it in SQL would skip Better Auth's delete hooks, which revoke the OAuth tokens bound to the
   session, and `ON DELETE SET NULL` would then unbind those tokens instead of ending them. */
async function clearExpiredSessionAddresses(authPool: Pool): Promise<void> {
  await authPool.query(
    `UPDATE auth.session SET "ipAddress" = NULL
     WHERE id IN (
       SELECT id FROM auth.session
       WHERE "expiresAt" < now() AND "ipAddress" <> ''
       LIMIT 500
     )`,
  );
}

export function startLeaseHousekeeping(
  pool: Pool,
  intervalMs: number,
  authPool?: Pool,
): () => void {
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
          if (authPool) await clearExpiredSessionAddresses(authPool);
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
