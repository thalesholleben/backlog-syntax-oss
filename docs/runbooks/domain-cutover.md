# Domain cutover

Portable first-deployment procedure. Public examples use the project's published
web and API domains. The hosted operator's control plane, server addresses, service
names and provider account details are intentionally maintained outside this repository.

1. Provision dedicated web, API and PostgreSQL 18 services. Keep the database port
   private and confirm that the selected environment is the intended target.
2. Configure `PUBLIC_WEB_URL` and `WEB_ORIGIN` for the public web origin;
   configure `PUBLIC_API_URL` and `NEXT_PUBLIC_API_URL` for the public API origin.
   The hosted product uses `backlog.syntaxlab.com.br` and `backlog-api.syntaxlab.com.br`.
3. Generate unique runtime secrets. Use only public URLs and feature flags as web
   build variables. Never reuse development passwords or deploy test seeds.
4. Set `NODE_ENV=production`, `ALLOW_TEST_PRINCIPAL=false`, exact CORS and a secure,
   host-only `__Host-` session cookie. Enable social login only after configuring
   both server credentials and the matching public feature flag.
5. Configure OAuth callbacks and MCP audience for the API host. Issue valid TLS
   certificates and validate origins before enabling any proxy. Require strict
   origin certificate validation when using an edge proxy.
6. Run `pnpm docker:test` and `pnpm test:rls` locally on disposable PostgreSQL 18.
   Verify `backlog_app` and `backlog_auth` lack SUPERUSER/BYPASSRLS and all tenant
   tables have ENABLE/FORCE RLS. Confirm the production catalog separately using
   read-only queries. Never point the automated suites at production.
7. Rehearse backup restoration locally. Record actual backup coverage privately;
   do not promise a recovery point that the configured schedule does not provide.
8. Require API `/ready` 200, web `/api/health` 200 and valid HTTPS. Check canonical,
   robots, sitemap, MCP/OAuth discovery, session cookie attributes and exact CORS.
9. Preserve immutable images and a tested rollback before opening traffic. Keep
   operator inventory, access instructions and deployment evidence private.

Liveness at `/health` alone does not prove database readiness. An upload accepted
by a deployment service does not prove that its build or rollout completed.
For subsequent releases, follow [production deploy](production-deploy.md).
