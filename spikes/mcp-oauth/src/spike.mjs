import { createHash } from "node:crypto";

import { createCimdClientDiscovery } from "@better-auth/cimd";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";

export const AUTH_ORIGIN = "https://auth.backlog-syntax.example";
export const AUTH_ISSUER = `${AUTH_ORIGIN}/api/auth`;
export const MCP_RESOURCE = "https://api.backlog-syntax.example/mcp";
export const JWKS_URL = `${AUTH_ISSUER}/jwks`;
export const REQUIRED_SCOPES = ["mcp:read"];
export const REDACTED_TOKEN = "verified-token-redacted";

export function createInjectedCimdDiscovery(fetchClientMetadataResource) {
  return createCimdClientDiscovery({
    fetchClientMetadataResource,
    metadataProfile: "mcp-2026-07-28",
  });
}

export function createStrictMcpTransport(onRequest) {
  return createMcpHandler(
    (context) => {
      onRequest?.(context);
      return new McpServer({
        name: "backlog-syntax-oauth-spike",
        version: "0.0.0",
      });
    },
    { legacy: "reject" },
  );
}

export function createPkceS256Challenge(verifier) {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export const MCP_PROTOCOL_VERSION = "2026-07-28";
