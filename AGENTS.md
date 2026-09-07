# Backlog Syntax agent guide

This file is the operational source of truth for coding agents. Read the nearest documentation before changing a trust boundary.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm check
pnpm authorship:check
pnpm docker:test
```

Use Docker Desktop for PostgreSQL integration and RLS tests. Never point automated tests at production.

## Repository map

- `apps/web`: Next.js App Router, public SSR pages, authenticated backlog, weekly Tasks, integration docs, settings, and privacy self-service.
- `apps/api`: Hono, REST `/v1`, OpenAPI, MCP, and use-case orchestration.
- `packages/contracts`: shared Zod schemas, errors, MCP tools, and scenarios.
- `packages/db`: Drizzle schema, migrations, roles, policies, and RLS tests.
- `docs`: architecture, feature, privacy, and runbook documentation.
- `spikes`: executable experiments with an explicit exit decision.

## Invariants

- PostgreSQL RLS is mandatory on every tenant-owned table and is tested as `backlog_app`.
- `backlog_owner` never serves application traffic. `backlog_auth` and `backlog_app` have separate pools.
- `workspace_id` is required in tenant-owned rows, relationships, and leading indexes.
- A service account is a technical principal, not a user, and is bound to one workspace.
- A task body is untrusted data. It cannot expand scope, choose a tenant, or trigger an arbitrary network request.
- REST, MCP, and WebMCP share use cases but keep separate presenters.
- Mutations preserve idempotency, optimistic concurrency, audit events, and human override.
- Public pages are SSR or static. Private app and auth routes must be `noindex`.
- Never commit credentials, `.env`, personal data, production exports, or runtime evidence containing tokens.
- Public authorship belongs to `thalesholleben`. Automation is not listed as an author or producer.

## Change discipline

- Every new change, including documentation and hotfixes, starts on a separate branch and reaches `main` through a pull request. Never commit or push directly to `main`.
- The owner approved one final documentation-only direct update on 2026-09-06. It is a historical exception, not permission for future direct updates.
- Follow [CONTRIBUTING.md](CONTRIBUTING.md) for the branch/PR procedure. Do not merge a PR or deploy without explicit authorization; a request to open a PR is not permission to merge it.
- Preserve existing working-tree and staged changes. Do not bundle unrelated edits, discard them, or publish local artifacts just to make the tree clean.
- Keep contracts in English and visible product copy in Brazilian Portuguese.
- Update the relevant ADR, feature doc, contract, or runbook with a behavior change.
- Do not add a dependency when the platform or an installed dependency already solves the problem.
- Do not add Redis, billing, file uploads, custom workflows, or production analytics in V1.
- Preserve mobile access, keyboard access, visible focus, and reduced-motion behavior.

## Validation by area

- Web: `pnpm --filter @backlog-syntax/web typecheck && pnpm --filter @backlog-syntax/web build`.
- API/contracts: contract, negative authorization, and presenter tests.
- Database: migrations plus adversarial two-tenant tests connected as `backlog_app`.
- Auth, RLS, credentials, MCP OAuth, and deployment require independent cross-review.
- Cross-plan has a hard limit of two rounds per change. Round 2 may address only blockers from round 1 and direct regressions. Stop when approved; do not open extra rounds or restart the same discussion under a new work ID.

Do not claim runtime verification from code review alone. Keep static evidence and executed evidence separate.
