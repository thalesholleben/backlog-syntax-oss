# Local development

## Objective

Run the integrated V1 locally with disposable PostgreSQL data.

## Prerequisites

- Node.js 24
- pnpm 11.24
- Docker Desktop with Compose

## Steps

```bash
cp .env.example .env
pnpm install --frozen-lockfile
docker compose up -d db
pnpm build:packages
```

Copy the example only when `.env` does not already exist (`Copy-Item .env.example .env`
is the PowerShell equivalent). Do not replace an existing environment. Keep
`PUBLIC_API_URL` and `NEXT_PUBLIC_API_URL` on `http://localhost:8787`, `WEB_ORIGIN` on
`http://localhost:3000`, and use the local web URL for `PUBLIC_WEB_URL` when testing metadata.
Use the non-prefixed local session cookie from the example on HTTP, never a production cookie.

Open two terminals at the repository root:

```bash
# API: explicitly load the root environment
node --env-file=.env --import tsx apps/api/src/server.ts

# Web: explicitly load the same environment
node --env-file=.env apps/web/node_modules/next/dist/bin/next dev apps/web
```

`pnpm dev` runs both package scripts, but the API's `tsx watch` command does not load
the root `.env` itself. Use the explicit commands above when the environment has not
already been loaded by the terminal. Never point local testing at production URLs or data.

Initialization scripts run only for a new PostgreSQL data volume. If the checkout adds
migrations after a volume was initialized, inspect the migration procedure; restarting
the container does not apply them. Do not delete existing local data to bypass this.

## Expected result

- web responds at `http://localhost:3000`;
- API liveness responds at `http://localhost:8787/health`, and database readiness at `/ready`;
- PostgreSQL is reachable only through the local Compose mapping;
- the `.env` file remains untracked.

## Validation

Stop local Next.js dev/start processes before building into the same `.next` directory.
Do not stop unrelated services just to run checks.

```bash
pnpm check
pnpm docker:test
git status --short
```

For documentation-only changes, validate relative links against the intended Git tree,
run `git diff --check` and `pnpm authorship:check`, and report only the checks actually run.
All new changes use the [branch and PR workflow](../../CONTRIBUTING.md).

## Cleanup of disposable data only

First confirm this is the local `backlog-syntax` Compose project and that its database
contains no data to preserve. To stop services without removing data, use `docker compose down`.
Only when discarding this specific disposable database is intended:

```bash
docker compose down --volumes --remove-orphans
```

This removes disposable local database volumes. Never run the cleanup command against a production Compose project.
