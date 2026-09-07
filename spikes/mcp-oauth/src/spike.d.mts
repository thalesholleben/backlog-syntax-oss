import type { cimd } from "@better-auth/cimd";
import type { McpHttpHandler, McpRequestContext } from "@modelcontextprotocol/server";

type MetadataFetch = Parameters<typeof cimd>[0]["fetchClientMetadataResource"];

export declare const AUTH_ORIGIN: "https://auth.backlog-syntax.example";
export declare const AUTH_ISSUER: "https://auth.backlog-syntax.example/api/auth";
export declare const MCP_RESOURCE: "https://api.backlog-syntax.example/mcp";
export declare const JWKS_URL: "https://auth.backlog-syntax.example/api/auth/jwks";
export declare const REQUIRED_SCOPES: readonly ["mcp:read"];
export declare const REDACTED_TOKEN: "verified-token-redacted";
export declare const MCP_PROTOCOL_VERSION: "2026-07-28";

export declare function createInjectedCimdDiscovery(
  fetchClientMetadataResource: MetadataFetch,
): ReturnType<typeof import("@better-auth/cimd")["createCimdClientDiscovery"]>;

export declare function createStrictMcpTransport(
  onRequest?: (context: McpRequestContext) => void,
): McpHttpHandler;

export declare function createPkceS256Challenge(verifier: string): string;
