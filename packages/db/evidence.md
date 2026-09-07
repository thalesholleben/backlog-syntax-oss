# Database and RLS evidence

Date: 2026-08-31

Environment: local Docker Desktop, disposable network and `tmpfs` database

PostgreSQL image: `postgres:18-alpine` (runtime reported PostgreSQL 18.6)

## Reproduce

From `packages/db`:

```sh
node scripts/run-rls-tests.mjs
```

The runner starts an isolated Compose project, runs migrations and seeds, executes the
negative owner sentinel and the RLS suite, then always removes containers, network and
volumes.

## Result

Final exit code: `0`

Database assertion: `RLS integration suite passed`

The run proved:

- migrations can be applied repeatedly;
- the deterministic two-tenant seed can be applied repeatedly;
- the integration suite refuses to run as `backlog_owner`;
- the positive suite connects as `backlog_app`;
- `backlog_app` is neither superuser nor `BYPASSRLS`;
- all six tenant-owned tables have both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`;
- all six tenant-owned tables have the `tenant_isolation` policy;
- no request context returns zero domain rows;
- request context is transaction-local and is cleared after commit;
- tenant A can select, insert, update and delete its own task data;
- tenant A cannot select, update or delete tenant B task data;
- cross-tenant insert and tenant reassignment fail closed;
- a tenant A task cannot reference tenant B's project;
- a service account cannot be rebound to another tenant;
- a user or service account cannot establish context for a tenant where it has no active membership;
- tenant A's service account cannot read tenant B token metadata;
- `backlog_app` has no access to the `auth` schema or its user table.

## Security boundary

`backlog_owner` is the non-runtime migration and security-definer role. It has
`BYPASSRLS` so the narrowly scoped membership helper can validate principals without
recursive RLS evaluation. Application traffic uses only `backlog_auth` or
`backlog_app`; both are `NOSUPERUSER NOBYPASSRLS NOINHERIT`.

The API must call the parameterized `setRequestContextInTransaction` helper on the same
transaction used for every domain query. The `backlog_app` credential is an internal
service credential and must never be exposed to clients.
