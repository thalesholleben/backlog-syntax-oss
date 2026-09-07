# MCP OAuth spike

Prova executável da fronteira OAuth do Backlog Syntax. O spike valida Better Auth 1.7.2, CIMD no perfil MCP 2026-07-28, `requireMcpAuth`, Hono, servidor MCP 2.0.0 e persistência real em PostgreSQL 18, sem credenciais externas ou rede de produção.

## O que está provado

- authorization code completo emitido pelo Better Auth, com usuário, sessão e consentimento persistidos;
- PKCE `S256` positivo e rejeição de challenge ausente, método `plain` e verifier incorreto;
- rejeição de `redirect_uri` não cadastrada e de resource/audience não permitido;
- access token do próprio provider aceito pelo MCP apenas com resource/audience e `mcp:read`;
- refresh token real, rotação e reuso idempotente do token anterior dentro da janela de tolerância observada;
- RFC 9728 Protected Resource Metadata e desafio `401` com `WWW-Authenticate`;
- CIMD com transporte injetado, URL HTTPS fictícia e perfil MCP 2026-07-28;
- remoção de `Authorization` e `Cookie` e redaction do token antes do dispatch MCP;
- Streamable HTTP stateless, servidor novo por request e `legacy: "reject"`.

## Executar tudo

Requisitos: Node.js 24+, pnpm 10 e Docker Desktop ativo.

```powershell
pnpm install
pnpm test:docker
```

`test:docker` é idempotente: remove uma execução anterior, prova o carregamento ESM com o binário `node`, sobe o PostgreSQL 18, espera o healthcheck, roda typecheck e a suíte completa e sempre desmonta containers, rede e dados efêmeros.

## Executar manualmente

```powershell
pnpm db:up
$env:DATABASE_URL='postgresql://backlog_test:local_ephemeral_only@127.0.0.1:55432/backlog_syntax_oauth_test'
pnpm probe:node
pnpm typecheck
pnpm test:evidence
pnpm db:down
```

O PostgreSQL fica exposto somente em `127.0.0.1:55432` e usa `tmpfs`; a credencial acima existe apenas para este banco local efêmero. Os testes geram segredos, chaves e tokens em memória e não os imprimem.

## Decisão

O núcleo técnico do Gate 1 está verde. A incompatibilidade estrutural TypeScript do plugin OAuth continua isolada no fallback aprovado: `oauth-runtime.mjs` e seu helper `spike.mjs` são ESM diretamente carregável pelo Node e publicam declarações TypeScript estreitas, sem cast inseguro ou suppressions. A sonda `pnpm probe:node` impede regressão para resolução exclusiva do Vitest. O grafo instalado não produz warning de peer.

O cross-review não encontrou P0/P1; o único P2, carregamento do fallback por Node puro, foi corrigido e coberto pela sonda direta. DPoP, revogação, introspecção opaca e o transporte CIMD endurecido de produção não são reivindicados por este spike; veja [ADR.md](ADR.md) e [evidence.txt](evidence.txt).
