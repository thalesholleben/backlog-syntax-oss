import { createHash, randomUUID } from "node:crypto";

import { cimd } from "@better-auth/cimd";
import { mcp, requireMcpAuth } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Hono } from "hono";

import {
  AUTH_ISSUER,
  AUTH_ORIGIN,
  JWKS_URL,
  MCP_RESOURCE,
  REDACTED_TOKEN,
  REQUIRED_SCOPES,
  createStrictMcpTransport,
} from "./spike.mjs";

export function createSpikeAuthOptions(fetchClientMetadataResource, input = {}) {
  return {
    appName: "Backlog Syntax MCP OAuth spike",
    baseURL: AUTH_ORIGIN,
    secret:
      input.secret ?? createHash("sha256").update(randomUUID()).digest("hex"),
    ...(input.database ? { database: input.database } : {}),
    emailAndPassword: { enabled: true },
    plugins: [
      jwt(),
      mcp({
        loginPage: "/login",
        consentPage: "/consent",
        resource: MCP_RESOURCE,
        scopes: ["openid", "profile", "email", "offline_access", ...REQUIRED_SCOPES],
      }),
      cimd({
        fetchClientMetadataResource,
        metadataProfile: "mcp-2026-07-28",
      }),
    ],
  };
}

export function createSpikeAuth(fetchClientMetadataResource, input = {}) {
  return betterAuth(createSpikeAuthOptions(fetchClientMetadataResource, input));
}

function withoutCredentials(request) {
  const headers = new Headers(request.headers);
  headers.delete("authorization");
  headers.delete("cookie");
  return new Request(request, { headers });
}

function authInfoFromClaims(claims) {
  const clientId = typeof claims.client_id === "string" ? claims.client_id : claims.sub;
  if (!clientId) throw new Error("A verified MCP token must identify its client");
  return {
    token: REDACTED_TOKEN,
    clientId,
    scopes: typeof claims.scope === "string" ? claims.scope.split(" ").filter(Boolean) : [],
    ...(typeof claims.exp === "number" ? { expiresAt: claims.exp } : {}),
    resource: new URL(MCP_RESOURCE),
    extra: { subject: claims.sub },
  };
}

export function createProtectedMcpEndpoint(auth, transport = createStrictMcpTransport()) {
  return requireMcpAuth(
    auth,
    (request, claims) =>
      transport.fetch(withoutCredentials(request), { authInfo: authInfoFromClaims(claims) }),
    {
      issuer: AUTH_ISSUER,
      resource: MCP_RESOURCE,
      jwksUrl: JWKS_URL,
      requiredScopes: REQUIRED_SCOPES,
      challengeScopes: REQUIRED_SCOPES,
    },
  );
}

export function createSpikeHonoApp(auth, transport = createStrictMcpTransport()) {
  const app = new Hono();
  const protectedMcp = createProtectedMcpEndpoint(auth, transport);

  app.all("/api/auth/*", (context) => auth.handler(context.req.raw));
  app.get("/.well-known/*", (context) => auth.handler(context.req.raw));
  app.post("/mcp", (context) => protectedMcp(context.req.raw));

  return app;
}
