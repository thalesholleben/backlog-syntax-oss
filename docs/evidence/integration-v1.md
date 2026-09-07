# Integrated V1 evidence

Date: 2026-08-31

Scope: local source and disposable Docker infrastructure only. No deploy, DNS or external
credentials were used.

## Reproduce

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:integration
pnpm docker:test
```

`pnpm docker:test` builds the production API and web artifacts, starts PostgreSQL 18, checks both
health endpoints and verifies both application containers run as non-root with read-only root
filesystems. It then runs the API integration suite and a Chromium flow without network fixtures:

```text
browser -> Next.js signup/onboarding/board -> Hono /v1 -> PostgreSQL
```

The browser creates an account with recorded legal acceptance, a workspace, project and task. It
reloads the board and observes the persisted task.

## Recorded result

The default `pnpm docker:test` command completed against a fresh PostgreSQL volume and production
builds of both images. Database readiness was withheld until every migration and seed finished;
the API reached healthy state without a restart:

```text
health=ok
ready=ready
web=ok
database_init=complete
container_user=node
api_restart_count=0
web_container_user=node
product_integration=ok  # 7/7 PostgreSQL tests
browser_integration=ok  # 1/1 Chromium flow
teardown=ok
```

The RLS harness also completed three consecutive runs from fresh volumes. It validates the 12
protected tenant tables and includes visibility and mutation probes across the six domain tables
introduced in `005_domain_v1.sql`.

Focused correction checks passed as follows:

```text
CIMD security: 34/34
Kanban and mobile fixture E2E: 5/5
Tabs component: 2/2
CSS naming guard: 0 errors, 0 warnings
Muted foreground contrast: 4.67:1 on the light muted surface
```

## Boundaries covered

- Email sessions and feature-flagged Google configuration; a social identity without legal
  acceptance cannot resolve a product principal.
- Exact Origin enforcement, secure host-only production-cookie policy and non-secure cookies only
  for explicit local/test HTTP configuration.
- Cross-tenant REST/PAT/export attempts return no tenant data; viewer write paths fail server-side.
- Service-account revocation also revokes its tokens and membership.
- Task idempotency, optimistic versions, claims, events, archive semantics and housekeeping purge.
- MCP OAuth authorization code with PKCE and resource-bound scopes.
- CIMD fetch protection for private, reserved, documentation and benchmark IPv4 ranges; special,
  mapped, historical 6bone and 6to4 IPv6; mixed DNS answers; DNS timeout and pinning; redirects and
  oversized responses.
- Account/workspace JSON export excludes secrets. Self-deletion requires a fresh human session,
  exact confirmation and a second active owner; shared workspace data survives identity deletion.

## Known pre-production gaps

- Password recovery is disabled until a real email adapter is configured.
- Google is hidden until both server credentials and the public build flag are set.
- Backup reconciliation, production monitoring, formal privacy contact and subprocessors require
  operational decisions before launch.
- Neither domain pair has been deployed. The documentation defaults to
  `backlog.thalesgomes.dev` and `api.backlog.thalesgomes.dev`; the isolated `.com` pair is an
  alternative and never reuses an unrelated API service.
