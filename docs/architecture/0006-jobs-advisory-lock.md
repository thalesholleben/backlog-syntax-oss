# ADR 0006: jobs and advisory locking

Status: accepted for V1

## Context

V1 needs durable housekeeping but does not need Redis or a separate worker fleet. Multiple API replicas must not perform the same sweep concurrently.

## Decision

Persist job state in PostgreSQL. The API process may run an idempotent housekeeping loop only while holding a stable `pg_try_advisory_lock`. A rolling deployment can transfer leadership safely.

The implemented loop expires task claims and deletes expired idempotency rows in bounded batches.
Lease validity never depends on the loop; request queries treat an elapsed lease as expired.
Session, invitation and broader retention purges remain explicit future work.

## Consequences

Shutdown releases the database connection and lock. Restart and duplicate-loop tests are mandatory. A separate worker or Redis is added only after measured load requires it.
