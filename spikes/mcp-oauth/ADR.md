# ADR 0001: fronteira OAuth do MCP remoto

Status: **GO técnico; cross-review sem P0/P1 e único P2 corrigido com sonda Node direta**.

Data: 2026-08-31

## Contexto

O Backlog Syntax precisa expor MCP remoto como superfície principal. Tokens devem ser emitidos para o resource MCP, validados no servidor e nunca reutilizados como credencial de outro provedor. O transporte alvo é MCP 2026-07-28 stateless, com suporte legado rejeitado.

## Decisão

Usar Better Auth 1.7.2 como authorization server e `@better-auth/mcp` como integração candidata. Usar `requireMcpAuth` na borda Hono e entregar ao SDK MCP apenas claims verificadas e um marcador redigido. Remover `Authorization` e `Cookie` antes do dispatch. Usar `createMcpHandler` com factory por request e `legacy: "reject"`.

CIMD usa `metadataProfile: "mcp-2026-07-28"`, client metadata HTTPS fictício e transporte injetado. Persistência usa PostgreSQL real com migrations oficiais do Better Auth.

## Evidência aprovada

| Controle | Evidência runtime |
| --- | --- |
| Persistência | PostgreSQL 18 confirmado; usuário, sessão e consentimento existem no banco após o fluxo |
| Authorization code | login/sessão, authorize, consentimento, callback, code e token endpoint executados pelos handlers reais |
| PKCE | `S256` emite token; challenge ausente e `plain` falham em authorize; verifier errado falha em token |
| Redirect/resource | redirect não cadastrado e resource diferente falham fechados |
| Token MCP | JWT do provider contém issuer e MCP resource na audience; `mcp:read` é exigido; token sem scope recebe `403` |
| Refresh | refresh token é emitido e rotacionado; reuso imediato do token anterior retorna idempotentemente o mesmo token rotacionado |
| Protected Resource Metadata | documento RFC 9728 contém resource e authorization server esperados |
| Sem passthrough | token opaco é rejeitado; bearer/cookie somem antes do SDK; `authInfo.token` recebe marcador redigido |
| CIMD | URL HTTPS fictícia passa pelo transporte injetado no perfil MCP; metadata inválida falha |
| Transporte | requests modernos criam instâncias distintas; request legado falha sem construir servidor |
| Compose | PostgreSQL 18 em loopback, `tmpfs`, healthcheck e teardown idempotente |

## Compatibilidade e fallback

Uma tentativa de composição totalmente TypeScript ainda falhou por incompatibilidade estrutural no tipo OpenAPI `parameters` do plugin OAuth 1.7.2. Não há cast inseguro nem suppressão: o fallback aprovado mantém o runtime em `oauth-runtime.mjs` e `spike.mjs`, com declarações estreitas em `oauth-runtime.d.mts` e `spike.d.mts`; testes e consumidores continuam sob TypeScript estrito.

Os imports do runtime usam extensões ESM que existem fisicamente. `pnpm probe:node` executa `node scripts/probe-node.mjs`, importa a composição e o helper sem Vitest, `tsx`, loader ou dependência transitiva e falha se os plugins ou helpers não estiverem disponíveis.

O warning de peer foi eliminado com versões diretas compatíveis no lockfile. `pnpm install` conclui sem warning de peer.

## Comportamento real de refresh

Better Auth 1.7.2 rotacionou o refresh token no primeiro uso. O reuso imediato do token anterior, dentro da janela padrão de tolerância, retornou `200` e exatamente o refresh token já rotacionado. O spike prova esse comportamento idempotente; reuso após expirar a janela não integra o Gate 1 e não foi simulado com relógio ou espera artificial.

## Fora do Gate 1

- DPoP, revogação e introspecção de token opaco;
- teste de reuso de refresh após a janela de tolerância;
- implementação produtiva do transporte CIMD com DNS resolve-once, IP público fixado e redirects recusados;
- UI, tenancy, RLS e qualquer scaffold do produto;

## Critério de avanço

Os critérios técnicos P0.2b estão fechados. O cross-review não deixou Blocker/P0 ou High/P1; o P2 de carregamento Node foi corrigido e revalidado pela suíte completa.
