# Backlog Syntax

> A secure, open-source, multi-tenant backlog for coordinating people and AI agents through REST, OpenAPI, and MCP.

[Leia em Português do Brasil](README.pt-BR.md)

Backlog Syntax treats agent work as an auditable domain workflow. Human users and service accounts are distinct principals, claims expire through leases, mutations use optimistic concurrency, and PostgreSQL Row-Level Security is the tenant boundary of last resort.

## Project status

The first hosted V1 is available at [backlog.syntaxlab.com.br](https://backlog.syntaxlab.com.br), free and without an availability SLA. It includes the authenticated web app, backlog, weekly tasks, REST/OpenAPI, remote MCP and privacy self-service. Google login and transactional password-recovery email remain disabled. See the [deployment runbook](docs/runbooks/domain-cutover.md) and [public transparency page](https://backlog.syntaxlab.com.br/transparencia).

This repository is the multi-tenant SaaS implementation, not the standalone workspace
backlog/Tasks skill. Its MIT license does not include access to hosted data or credentials.
See the [release baseline](docs/README.md#release-baseline) for the distinction between
the deployed version and code still awaiting a PR.

## Using the product

- [Open the app](https://backlog.syntaxlab.com.br/entrar): a valid existing session returns to an accessible workspace without another password prompt.
- **Backlog** shows the workspace's tasks by status, with project/owner filters and an activity trail.
- **Tasks** schedules those same tasks across six weekly columns. Scheduling and deadlines are independent; unscheduled items remain in the backlog.
- [Integration guide](https://backlog.syntaxlab.com.br/documentacao): public boxed documentation and a contextual version inside the workspace.
- [Interactive API reference](https://backlog-api.syntaxlab.com.br/docs) and [OpenAPI JSON](https://backlog-api.syntaxlab.com.br/openapi.json): REST contracts for clients and agents.
- Remote MCP uses `https://backlog-api.syntaxlab.com.br/mcp`. WebMCP is an optional browser enhancement, not a requirement for the app.

## Product preview

Updated on September 6, 2026. The landing capture shows the published hero;
Backlog and Tasks show the current interface with fictional demo data, not customer records.

### Public landing page

![Backlog Syntax public landing page](docs/assets/screenshots/landing-desktop.png)

### Workspace board

![Backlog Syntax workspace board with four task status columns](docs/assets/screenshots/board-desktop.png)

### Weekly Tasks

![Backlog Syntax weekly Tasks with six day columns, deadlines and an unscheduled queue](docs/assets/screenshots/tasks-desktop.png)

## Why this project exists

Most task boards expose cards to agents but do not model safe coordination. Backlog Syntax is designed around explicit claims, evidence, handoffs, decision requests, human override, idempotency, and tenant isolation.

The intended audiences are solo builders, small human-agent teams, and mentees who want a realistic reference implementation they can self-host and study.

## Architecture at a glance

| Surface | Technology | Responsibility |
| --- | --- | --- |
| Web | Next.js App Router | Public SSR pages and the responsive authenticated product |
| API | Hono + OpenAPIHono | REST `/v1`, OpenAPI, auth enforcement, use cases |
| Agent API | MCP Streamable HTTP | Scoped tools and resources over the same use cases |
| Data | PostgreSQL 18 + Drizzle | Domain data, migrations, roles, grants, and RLS |

The monorepo uses `pnpm`. Better Auth is limited to identity, sessions, social login, and OAuth provider responsibilities. Workspace tenancy belongs to the product domain.

Read the [architecture decisions](docs/architecture/README.md) and [security model](docs/architecture/0003-database-roles-rls.md) before changing a trust boundary.

## Local development

Prerequisites:

- Node.js 24
- pnpm 11.24
- Docker Desktop with Compose

```bash
cp .env.example .env
pnpm install --frozen-lockfile
docker compose up -d db
pnpm build:packages
```

From the repository root, start the API and web in separate terminals, loading the root environment explicitly:

```bash
# Terminal 1
node --env-file=.env --import tsx apps/api/src/server.ts

# Terminal 2
node --env-file=.env apps/web/node_modules/next/dist/bin/next dev apps/web
```

Do not overwrite an existing `.env`. Keep both API origins set to `http://localhost:8787`
and `WEB_ORIGIN` set to `http://localhost:3000` for local development. Set `PUBLIC_WEB_URL`
to the local web URL when validating local canonicals. See the [local runbook](docs/runbooks/local-development.md).

Run `pnpm check` and `pnpm docker:test` after stopping the local Next.js process. The production
build gate writes to `.next` and intentionally refuses to run against the same directory while
`next dev` or `next start` is active.

Default local endpoints are `http://localhost:3000` for the web app and `http://localhost:8787` for the API. `pnpm docker:test` builds isolated non-root API and web images, drives a real browser flow and removes its disposable database. Values in `.env.example` are local-only examples and must be replaced outside local development.

## Security model

- `backlog_owner` owns migrations and never serves runtime traffic.
- `backlog_auth` can access only identity and session data.
- `backlog_app` is an unprivileged domain role with `NOBYPASSRLS`.
- Tenant-owned tables require `workspace_id`, forced RLS, and composite tenant keys.
- Production browser cookies are secure, host-only `__Host-` cookies. Cross-origin browser access uses an exact allowlist.
- Service-account credentials are bound to a workspace and scopes. Agents cannot select another tenant.
- Task text is untrusted input and cannot grant scopes or trigger arbitrary URL fetches.

See [SECURITY.md](SECURITY.md) for responsible disclosure. Do not report vulnerabilities in public issues.

## Repository map

```text
apps/web            Next.js public site and authenticated product UI
apps/api            Hono REST/OpenAPI and MCP adapters
packages/contracts  Shared schemas, errors, tools, and scenarios
packages/db         Drizzle schema, migrations, roles, and RLS tests
docs                Architecture, feature, privacy, and operational docs
spikes              Executable risk-reduction experiments
```

## Documentation

- [Documentation index and release baseline](docs/README.md)
- [Authenticated app, backlog and weekly Tasks](docs/features/app-web.md)
- [Public site, documentation and hero](docs/features/public-web.md)
- [Architecture decisions](docs/architecture/README.md)
- [Product scope](docs/features/product-scope.md)
- [LGPD baseline](docs/privacy/README.md)
- [Local development runbook](docs/runbooks/local-development.md)
- [Contributing guide](CONTRIBUTING.md)

## Domain configuration

Production uses `https://backlog.syntaxlab.com.br` for the web and
`https://backlog-api.syntaxlab.com.br` for the API.
PostgreSQL 18 is dedicated to Backlog Syntax and is not shared with other products. V1 does not use Redis.
`PUBLIC_WEB_URL` controls canonical/social URLs; `WEB_ORIGIN` controls the allowed browser origin.
`PUBLIC_API_URL` and `NEXT_PUBLIC_API_URL` identify the dedicated API. Public URL changes require
a web rebuild. Keep this API separate from unrelated services.

## Contribution workflow

All subsequent changes, including documentation, use a **separate branch and a pull request
into `main`**. Direct commits/pushes to `main` are not permitted. PR merge and production deploy
require explicit approval. See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE) © 2026 Thales Gomes (`thalesholleben`).
