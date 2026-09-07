# Documentation

This is the documentation for the Backlog Syntax multi-tenant SaaS. It is independent
of the standalone backlog/Tasks tooling used in the author's local workspace.

## Start here

- [English README](../README.md) and [README em português](../README.pt-BR.md): product, URLs and quickstart.
- [Product scope](features/product-scope.md): supported workflows, invariants and non-goals.
- [Authenticated app](features/app-web.md): login/session return, backlog, weekly Tasks and workspace docs.
- [Public web](features/public-web.md): landing page, boxed documentation, branding and responsive hero.
- [Languages and discovery](features/internationalization.md): English/Portuguese UI, SEO, Content Signals and Markdown negotiation.
- [Architecture decisions](architecture/README.md): tenancy, database roles, concurrency and agent interfaces.
- [Privacy baseline](privacy/README.md): inventory, rights, retention and provider limitations.

## Integration surfaces

| Surface | Entry point | Contract |
| --- | --- | --- |
| Public guide | [Web documentation](https://backlog.syntaxlab.com.br/documentacao) | REST, MCP and WebMCP setup; tenant placeholders in public examples |
| REST | [Interactive reference](https://backlog-api.syntaxlab.com.br/docs) | Generated from shared schemas; [OpenAPI JSON](https://backlog-api.syntaxlab.com.br/openapi.json) |
| Remote MCP | `https://backlog-api.syntaxlab.com.br/mcp` | Workspace-scoped technical identity; [OAuth decisions](architecture/0009-mcp-oauth-fallback.md) |
| WebMCP | Supported browser, authenticated active project | Optional contextual tools; [progressive enhancement](architecture/0008-webmcp-progressive-enhancement.md) |

Backlog and Tasks are two views of the same records, not independent task databases.
`scheduledDate` chooses a day in the weekly agenda; `dueDate` remains the deadline.
An API token is not a browser login session and must never be pasted into a URL or committed.

## Operations and contribution

- [Local development](runbooks/local-development.md)
- [Production deploy](runbooks/production-deploy.md)
- [First cutover, readiness and rollback](runbooks/domain-cutover.md)
- [Data-subject requests](runbooks/data-subject-request.md)
- [Incident response](runbooks/incident-response.md)
- [Required branch + PR workflow](../CONTRIBUTING.md)
- [Agent instructions](../AGENTS.md), also imported by [CLAUDE.md](../CLAUDE.md)

## Release baseline

The hosted V1 and the user-approved hero were published on 2026-09-06. The desktop
hero uses the exact approved JPEG, a human hand and a robotic hand working on one
board, in full cover. Below 1024px, a separate image band precedes the text. The H1
keeps its wording at 85% of the previous responsive size. API and dedicated PostgreSQL
were unchanged by that web-only release.

Hosted release identifiers, image digests and rollback evidence are maintained in
private operations records. Historical release checks covered readiness, assets and
public responsive views; they are not a continuous availability guarantee.

The first hosted release was built from a sanitized local source archive. This
publication snapshot includes the application source, assets and migrations plus
publication cleanup, and must not be assumed to match the currently deployed image.
Preparing or publishing this source does not deploy it. Future deployment records
must identify the approved Git commit as well as the image/source hash.

All subsequent changes, including docs and hotfixes, follow branch + PR. This rule does
not itself configure GitHub branch protection, change repository visibility, merge
pending work, or authorize another deployment.
