# Production deploy

Portable self-hosting runbook. Keep the hosted operator's panel, server addresses,
service inventory, backup locations and access procedures in private operations documentation.

## Prepare

1. Promote an explicitly reviewed Git commit through the repository's branch/PR workflow.
2. Run `pnpm check` with the target public build URLs configured, then `pnpm docker:test`
   against disposable local infrastructure. Never run automated tests against production.
3. Build API and web from `apps/api/Dockerfile` and `apps/web/Dockerfile`. Set
   `NEXT_PUBLIC_API_URL` and `PUBLIC_WEB_URL` to the intended public endpoints at build time.
4. Exclude `.env`, Git metadata, credentials, private operational notes, dumps, test
   artifacts and seeds from source archives and images. Inspect the final image.
5. Identify the exact target privately and preserve the outgoing immutable image tags.
   Change only the intended Backlog service. Deployment needs the owner's authorization.

## Runtime configuration

- Generate independent random `AUTH_SECRET` and database role passwords. Never use
  the development examples in production or put runtime secrets in web build variables.
- Run the API as `backlog_app` for domain queries and `backlog_auth` for authentication.
  `backlog_owner` is reserved for migrations and must not serve traffic.
- Require `NODE_ENV=production`, HTTPS public origins, exact CORS, a host-only
  `__Host-` session cookie and `ALLOW_TEST_PRINCIPAL=false`.
- Keep PostgreSQL private, with ENABLE/FORCE RLS on tenant tables and NOBYPASSRLS
  on both runtime roles. Production must not contain seed/demo credentials.
- Configure backup destinations, retention, restores and maintenance separately in
  private operations records. Do not publish provider account or storage identifiers.

## Migrations and promotion

Before a schema change, take a backup and demonstrate restoration in a disposable
database. Check which migrations already ran; initialization scripts only run for
new volumes. Apply migrations with the owner role, never from the runtime API pool.
Promote the reviewed immutable image and verify the actual running image digest.
The exact service names and provider-specific commands belong to private operations records.

## Verify

`/health` proves liveness. Require `/ready` HTTP 200 for database readiness and
`/api/health` on the web app. Check HTTPS, cookie attributes, exact credentialed CORS
and the expected MCP resource audience. Never print cookies, OAuth codes or tokens.
Use only authorized disposable accounts for any production walkthrough; automated
security, load, integration and destructive tests belong in isolated local infrastructure.

## Rollback

Restore the previous immutable image for the affected service and require readiness
again. Image rollback does not reverse migrations. Do not destroy or restore the
production database as a code rollback, and do not change unrelated services.
Keep source commit, image digest, validation and rollback evidence in private release records.

See [domain cutover](domain-cutover.md) for first deployment and
[the release baseline](../README.md#release-baseline) for source/deployment provenance.
