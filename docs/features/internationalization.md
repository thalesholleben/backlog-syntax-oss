# English, Portuguese and public content discovery

The public website, authentication screens and workspace application support English and
Brazilian Portuguese. The URL determines the language; explicit PT/EN links preserve the
current page, query parameters and fragment. No preference cookie or automatic
geolocation/browser-language redirect is used.

## Routes and presentation

| Portuguese | English |
| --- | --- |
| `/` | `/en` |
| `/documentacao` | `/en/docs` |
| `/privacidade`, `/cookies`, `/termos`, `/transparencia` | `/en/privacy`, `/en/cookies`, `/en/terms`, `/en/transparency` |
| `/entrar`, `/cadastro`, `/aceitar-termos` | `/en/sign-in`, `/en/sign-up`, `/en/accept-terms` |
| `/recuperar-senha`, `/recuperar-senha/redefinir` | `/en/forgot-password`, `/en/reset-password` |
| `/onboarding`, `/consent` | `/en/onboarding`, `/en/consent` |
| `/w/:workspace`, `/w/:workspace/tasks` | `/en/w/:workspace`, `/en/w/:workspace/tasks` |
| `/w/:workspace/projetos/:project` | `/en/w/:workspace/projects/:project` |
| `/w/:workspace/documentacao` | `/en/w/:workspace/docs` |
| `/w/:workspace/configuracoes/:section` | `/en/w/:workspace/settings/:section` |

Settings sections map `perfil`, `membros`, `agentes` and `privacidade` to `profile`,
`members`, `agents` and `privacy`. Workspace/project slugs and user-authored records
are preserved exactly. API paths, enum values, scopes, tokens and stored dates retain
their existing contracts. Presentation dates and status labels follow the selected language;
the weekly agenda still begins on Monday.

`apps/web/proxy.ts` rewrites public URLs to `app/[locale]` and redirects internal spellings
to their public canonical URL. `skipProxyUrlNormalize` preserves the listener origin for
internal rewrites on loopback IPv4 hosts. Root parameters supply server locale without cookies,
so public pages remain statically generated HTML. Client links and redirects use the shared
navigation adapter. Google callback URLs preserve locale when that optional feature is enabled.

`lib/i18n/messages.ts` contains shared client UI translations; `server-messages.ts` adds public
page copy without shipping that copy as a client dictionary. Use `t()` only with first-party
literal messages and interpolation values. Never pass task titles, descriptions, account names
or server error details as translation keys. Localize errors using stable API problem codes.

## SEO and AI consumers

Each public page has its own canonical, translated title/description, `html lang`, Open Graph
locale/image and reciprocal `pt-BR`, `en`, `x-default` links. Sitemap lists twelve public URLs.
Private/auth routes remain `noindex` and have no public hreflang alternatives. JSON-LD follows
visible page content; FAQ uses the same source as visible answers. No ratings, usage counts,
search volumes or ranking outcomes are invented.

`robots.txt` and public responses declare `Content-Signal: search=yes, ai-input=yes, ai-train=no`.
These are crawler preferences, not authorization. They do not change the MIT source license or
permit access to private data. Authentication, API authorization and RLS protect workspace data.

Explicit `Accept: text/markdown` on an allowlisted public URL returns Markdown generated from
that page's server-rendered `<main>`. HTML remains the default, `q=0` excludes Markdown, and a
stronger HTML preference wins. RSC/prefetch requests bypass negotiation. Both representations
preserve `Vary: Accept` alongside Next.js variation headers; Markdown also links its canonical.
A pinned pnpm patch for Next.js 16.3.3 preserves existing `Vary` values in its App Page
response handler, which otherwise overwrites the proxy header. The browser negotiation test
checks exact header tokens for all twelve public URLs. Remove the patch when a Next.js
upgrade preserves these headers and the same runtime test passes.

The internal `/api/public-markdown/:publicLocale/:page` endpoint accepts only the six public
page identifiers (`home` stands for `/`) and two locales. It fetches a fixed IPv4 loopback listener
using `PORT` (default 3000), a timeout and no redirects. It never forwards incoming Host,
cookies, authorization or query strings, and never accepts a target URL. Invalid identifiers
return 404; rendering failures return an uncached 503. Bind self-hosted web listeners to IPv4
loopback or an address that accepts it, and keep `PORT` equal to the web listener port.
The Docker image carries the public `PUBLIC_WEB_URL` build argument into its runtime stage so
dynamic Markdown canonicals agree with the statically generated HTML and sitemap.

Markdown, Content Signals and the optional `llms.txt` file do not guarantee ranking or citations.
Google's guidance says standard SEO remains applicable and does not require Markdown,
llms.txt or special AI schema. Actual international indexation and traffic require measurement
after a deployment; a local test does not establish either outcome.

## Validation and sources

`pnpm --filter @backlog-syntax/web exec playwright test` builds and starts a local web server.
`english.spec.ts` covers public HTML without JavaScript, metadata, negotiation, private-page
exclusion, auth parameter preservation, fixture-based workspace workflows and mobile widths.
Unit tests cover locale routing, interpolation, date semantics and Markdown negotiation.
`pnpm check` and `pnpm docker:test` remain the release checks; Docker runs real API/RLS tests
against disposable local infrastructure, never production.

Guidance consulted on September 7, 2026:

- [Google: multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google: localized versions and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: AI features](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: AI optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Content Signals](https://contentsignals.org/)
- [Cloudflare: Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)
