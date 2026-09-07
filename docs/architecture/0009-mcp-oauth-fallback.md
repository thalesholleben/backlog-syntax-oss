# ADR 0009: MCP OAuth spike and fallback

Status: accepted and executable in V1

## Context

Remote MCP requires interoperable authorization, resource metadata, PKCE, audience restriction, and scopes. Framework plugins may lag the active MCP authorization profile.

## Decision

The executable integration proves protected-resource metadata, CIMD compatibility, PKCE,
resource-bound audience, scope enforcement and correct unauthenticated behavior.

Preferred path: Better Auth as the OAuth provider with its official MCP integration where compatible. Fallback: use Better Auth's provider endpoints with the official MCP SDK and a small explicit resource-server adapter. Both paths retain one issuer and the same domain scopes.

## Consequences

The pinned Better Auth provider and MCP integration are the selected V1 path. Token passthrough is
prohibited. CIMD metadata fetching resolves and pins public DNS answers, rejects redirects and
bounds DNS, request time and response size.

## Node 24 transport compatibility

The custom HTTPS lookup in `apps/api/src/auth/runtime.mjs` must honor both Node lookup
callback shapes. With `all: true`, return the complete, already validated address array;
otherwise return the first validated address and its family. Node 24 enables
`autoSelectFamily` by default and requests the array form. Returning a scalar in that
mode produces `ERR_INVALID_IP_ADDRESS: Invalid IP address: undefined`, which the CIMD
provider reports as `invalid_client` with the generic metadata-fetch error.
See the [Node socket connection contract](https://nodejs.org/docs/latest-v24.x/api/net.html#socketconnectoptions-connectlistener).

IPv6/IPv4 fallback uses only the DNS candidates validated by `resolvePublicAddresses`.
It must never trigger another DNS resolution. Any private or reserved candidate rejects
the whole answer before HTTPS starts. Hostname/SNI certificate validation, port 443,
redirect rejection and the 64 KiB transport cap remain unchanged. DNS has a 5-second
deadline; the existing HTTPS request has a 5-second socket inactivity timeout, not a
new application-level timeout per candidate or a guaranteed total wall-clock deadline.

Run the deterministic transport and SSRF regression tests:

```bash
pnpm --filter @backlog-syntax/api exec vitest run test/cimd-transport.test.ts test/cimd-security.test.ts
```

For a separate public-network diagnostic after building the API:

```bash
pnpm build:packages
pnpm --filter @backlog-syntax/api build
node --input-type=module -e 'import {fetchClientMetadataResource} from "./apps/api/dist/src/auth/runtime.mjs"; const url="https://claude.ai/oauth/claude-code-client-metadata"; const response=await fetchClientMetadataResource(url); if(response.status!==200) throw new Error("HTTP "+response.status); const metadata=await response.json(); if(metadata.client_id!==url) throw new Error("client_id mismatch"); console.log("CIMD transport OK");'
```

This checks the real compiled HTTPS transport against the official Claude Code document,
not the full Claude Desktop authorization flow. That document is a diagnostic target,
not a client allowlist or an MCP server URL. After an authorized API deployment, retry
the actual connector in Claude Desktop. If it still fails, inspect its actual `client_id`
and the upstream HTTP result without logging OAuth codes, state, cookies or tokens.
