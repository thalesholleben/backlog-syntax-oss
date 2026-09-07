# Core agent-native runtime evidence

Date: 2026-08-31

Scope: Better Auth, REST/OpenAPI V1, service-account PATs, MCP OAuth, PostgreSQL tenant isolation and lease housekeeping. No deployment, DNS or external credentials were used.

## Reproducible results

| Check | Command | Result |
| --- | --- | --- |
| Product integration | `pnpm test:integration` | Passed: 1 file, 7 PostgreSQL 18 tests; teardown `ok` |
| API typecheck | `pnpm --filter @backlog-syntax/api typecheck` | Passed |
| API unit tests | `pnpm --filter @backlog-syntax/api test` | Passed: 2 files and 9 tests; integration suite skipped unless explicitly enabled |
| RLS sentinel | `pnpm test:rls` | Passed as `backlog_app`; the `backlog_owner` sentinel failed as intended |
| OpenAPI drift | `pnpm openapi:check` | Passed; 19 documented path entries and 30 operations |

## Runtime behavior proven

- Better Auth persists users and sessions through the isolated `backlog_auth` pool using UUID identifiers.
- The session cookie is the explicit host-only `__Host-backlog_session` cookie. Browser mutations without the exact configured Origin fail closed.
- Two independent users create separate workspaces. Cross-tenant REST access returns `404`, including a PAT attempting to select another tenant.
- Service accounts receive a tenant membership. PAT secrets are returned once, only their SHA-256 hash is persisted, and `read` PATs cannot mutate tasks.
- REST performs `list -> claim -> evidence -> complete`; stale `If-Match` updates and idempotency-key payload reuse are rejected.
- Better Auth issues an authorization-code/PKCE OAuth token for the MCP resource. The protected stateless modern-only endpoint performs the equivalent `list -> claim -> evidence -> complete` scenario.
- MCP validates issuer, resource/audience and `read` at the OAuth boundary, filters identity-only scopes from the product principal, and requires `write` per mutating tool.
- The MCP transport receives neither the bearer token nor browser cookies. Its `authInfo.token` value is redacted.
- The lease worker uses a PostgreSQL advisory lock and the `private.expire_task_leases()` security-definer function; an expired claim becomes reclaimable.

## Operational note

Superseded by the full web/API/PostgreSQL container evidence in
[`integration-v1.md`](./integration-v1.md). Both production images build, both application
containers run as the non-root `node` user, and the real Chromium flow persists a task through the
public web and API surfaces before a clean teardown.
