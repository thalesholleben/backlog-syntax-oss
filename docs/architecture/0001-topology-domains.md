# ADR 0001: topology and domains

Status: accepted for V1

## Context

The web app and API require independent scaling and an explicit browser trust boundary. The
approved public web host is `backlog.syntaxlab.com.br`, running on the VPS that also hosts
`thalesgomes.com`; that existing site also has an unrelated API service.

## Decision

Run `apps/web` and `apps/api` as separate services. The web canonical is
`https://backlog.syntaxlab.com.br`; the production API is `https://backlog-api.syntaxlab.com.br`.
The API hostname remains environment-driven and dedicated to Backlog Syntax, never the
existing generic API host. PostgreSQL 18 runs in a dedicated Backlog service, not a database
shared with another project. V1 does not require Redis.

All URLs come from validated environment variables. Browser access uses exact CORS and Origin allowlists with credentials. Session cookies are host-only, use the `__Host-` prefix, and never set a parent-domain `Domain` attribute.

## Consequences

Cross-origin behavior needs runtime tests. Domain cutover changes configuration and DNS; the
source fallback exists only to keep canonical metadata deterministic when a container build
argument is empty. Infrastructure and DNS remain deployment concerns and are not required for
local development.
