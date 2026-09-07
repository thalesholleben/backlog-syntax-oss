# ADR 0005: concurrency, idempotency, and claims

Status: accepted for V1

## Context

Humans and agents retry requests and may update the same task concurrently. Last-write-wins would hide lost work and permit claim stealing.

## Decision

Every mutable task exposes a version. REST emits an `ETag`; MCP and WebMCP expose `expectedVersion`. Version preconditions are required for status, position, assignee, claim, and blocking changes. Stale writes return a structured conflict with the current version and safe snapshot.

Idempotency keys are scoped by workspace, principal, and operation. Reusing a key with another payload is rejected. A claim records its owner, lease expiry, and heartbeat. Expiry is evaluated during reads and writes even if housekeeping is unavailable. Humans can revoke a claim.

## Consequences

Clients must handle deterministic conflict responses. Ordering uses fractional positions with `(position, id)` as a stable tie-breaker. Idempotency retention and rebalance thresholds must be documented with the implementing migration.
