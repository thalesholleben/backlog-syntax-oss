# Gate 1 foundation evidence

Historical snapshot: this document records the original Gate 1 state. Features listed as absent
below were subsequently integrated and are covered by [Integrated V1 evidence](integration-v1.md).

Date: 2026-08-31

Environment: local Windows host, Node.js 24, pnpm 11 and Docker Desktop Linux containers.

## Gate statement

Gate 1 freezes the initial contracts and proves the foundation boundaries before product feature work expands. This evidence covers the MCP OAuth spike, contract-first API mock, PostgreSQL roles and RLS, the public web shell, repository checks and a fresh Compose stack.

## Source evidence

- MCP OAuth spike: `spikes/mcp-oauth/evidence.txt` and `spikes/mcp-oauth/ADR.md`.
- API, contracts, OpenAPI and API image: `docs/evidence/gate-1-api-contracts.md`.
- PostgreSQL roles, migrations, deterministic tenants and RLS: `packages/db/evidence.md`.
- Public web shell: `apps/web`, verified by the root TypeScript and production build commands below.

## Consolidated run

| Check | Command | Result |
| --- | --- | --- |
| Frozen dependency graph | `pnpm install --frozen-lockfile` | Passed |
| Full repository gate | `pnpm check` | Passed: format, lint, typecheck, production builds, contracts 3/3, API 18/18, RLS, OpenAPI and authorship guard |
| RLS integration | `pnpm test:rls` through `pnpm check` | Passed as `backlog_app`; the owner sentinel failed as intended before the runtime suite passed |
| Fresh Compose stack | `pnpm docker:test` | Passed: PostgreSQL 18 and API healthy, `/health` returned `ok`, `/ready` returned `ready`, API user was `node`, teardown returned `ok` |
| Whitespace | `git diff --check` | Passed |

## Boundaries proven by the gate

- Identity and product tenancy are separate boundaries.
- Runtime database access uses distinct `backlog_auth` and `backlog_app` roles.
- Tenant-owned tables fail closed under forced RLS, and the negative sentinel rejects owner-based test evidence.
- The same workspace context use case is presented separately through REST and MCP.
- The ten MCP tool contracts and scopes are frozen; only `get_workspace_context` is registered in the Gate 1 runtime.
- Liveness does not depend on PostgreSQL. Readiness checks both runtime pools.
- Production configuration fails fast if `ALLOW_TEST_PRINCIPAL=true`; the default remains `false`. This closes review finding `R1-ALLOW_TEST_PRINCIPAL-no-prod-guard` (P2).
- The local production-like API container runs as a non-root user with a read-only root filesystem.
- The web shell builds as static public pages with private product functionality still absent.
- The technical domain remains environment-driven. Documentation defaults to `backlog.thalesgomes.dev` and `api.backlog.thalesgomes.dev`; the code does not reuse an unrelated API service.

## Intentional non-goals

- Product login, sessions, Google OAuth and service account authentication are not implemented in Gate 1.
- Nine contracted MCP tools are not implemented yet.
- The current web application is a public shell, not the authenticated backlog UI.
- No deploy, DNS change, remote repository creation or production credential was used.
