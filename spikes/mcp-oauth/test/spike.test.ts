import { generateKeyPairSync, sign } from "node:crypto";

import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { validateCimdMetadata, validateClientIdUrl } from "@better-auth/cimd";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  createProtectedMcpEndpoint,
  createSpikeAuth,
  createSpikeHonoApp,
} from "../src/oauth-runtime.mjs";

import {
  AUTH_ISSUER,
  AUTH_ORIGIN,
  JWKS_URL,
  MCP_PROTOCOL_VERSION,
  MCP_RESOURCE,
  REDACTED_TOKEN,
  createInjectedCimdDiscovery,
  createPkceS256Challenge,
  createStrictMcpTransport,
} from "../src/spike.mjs";

const CLIENT_METADATA_URL = "https://agent.example/client-metadata.json";
const TEST_KID = "backlog-syntax-spike-key";
const realFetch = globalThis.fetch;

let privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];
let jwk: JsonWebKey;

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function accessToken(overrides: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "RS256", kid: TEST_KID, typ: "at+jwt" });
  const payload = encodeJson({
    iss: AUTH_ISSUER,
    aud: MCP_RESOURCE,
    sub: "user-spike",
    client_id: "agent-spike",
    scope: "mcp:read",
    iat: now,
    exp: now + 300,
    ...overrides,
  });
  const signingInput = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString(
    "base64url",
  );
  return `${signingInput}.${signature}`;
}

function modernRequest(token?: string): Request {
  const headers = new Headers({
    "content-type": "application/json",
    "mcp-method": "server/discover",
    "mcp-protocol-version": MCP_PROTOCOL_VERSION,
  });
  if (token) headers.set("authorization", `Bearer ${token}`);

  return new Request(MCP_RESOURCE, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "server/discover",
      params: {
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: MCP_PROTOCOL_VERSION,
          [CLIENT_INFO_META_KEY]: { name: "spike-test", version: "0.0.0" },
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    }),
  });
}

beforeAll(() => {
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  privateKey = pair.privateKey;
  jwk = pair.publicKey.export({ format: "jwk" });
  Object.assign(jwk, { alg: "RS256", kid: TEST_KID, use: "sig" });

  vi.stubGlobal("fetch", async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url === JWKS_URL) {
      return Response.json({ keys: [jwk] });
    }
    return realFetch(input);
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("Better Auth MCP discovery", () => {
  it("publishes RFC 9728 protected resource metadata", async () => {
    const auth = createSpikeAuth(async () => new Response(null, { status: 500 }));
    const response = await auth.handler(
      new Request(`${AUTH_ORIGIN}/.well-known/oauth-protected-resource/mcp`),
    );

    expect(response.status, await response.clone().text()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      resource: MCP_RESOURCE,
      authorization_servers: [AUTH_ISSUER],
      bearer_methods_supported: ["header"],
    });
  });

  it("advertises the real S256 PKCE contract", async () => {
    const auth = createSpikeAuth(async () => new Response(null, { status: 500 }));
    const response = await auth.handler(
      new Request(`${AUTH_ISSUER}/.well-known/oauth-authorization-server`),
    );
    const metadata = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(metadata["code_challenge_methods_supported"]).toEqual(["S256"]);
    expect(
      createPkceS256Challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    ).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("CIMD MCP 2026-07-28 profile", () => {
  it("discovers and validates a fictitious HTTPS client through the injected transport", async () => {
    const injectedTransport = vi.fn(async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : input.toString();
      expect(url).toBe(CLIENT_METADATA_URL);
      return Response.json({
        client_id: CLIENT_METADATA_URL,
        client_name: "Backlog Syntax test agent",
        redirect_uris: ["http://127.0.0.1:43111/callback"],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      });
    });
    const discovery = createInjectedCimdDiscovery(injectedTransport);

    expect(discovery.matches(CLIENT_METADATA_URL)).toBe(true);
    expect(validateClientIdUrl(CLIENT_METADATA_URL)).toBeNull();
    const fetchMetadata = discovery.fetchClientMetadataResource;
    expect(fetchMetadata).toBeTypeOf("function");
    if (!fetchMetadata) throw new Error("CIMD discovery did not retain its injected transport");
    const response = await fetchMetadata(CLIENT_METADATA_URL, {
      headers: new Headers({ accept: "application/json" }),
      redirect: "error",
    });
    const raw = await response.json();
    const validation = validateCimdMetadata(CLIENT_METADATA_URL, raw, {
      metadataProfile: "mcp-2026-07-28",
    });

    expect(injectedTransport).toHaveBeenCalledOnce();
    expect(validation.valid).toBe(true);
  });

  it("rejects metadata that omits the MCP pinned client_name", () => {
    const validation = validateCimdMetadata(
      CLIENT_METADATA_URL,
      {
        client_id: CLIENT_METADATA_URL,
        redirect_uris: ["http://127.0.0.1:43111/callback"],
      },
      { metadataProfile: "mcp-2026-07-28" },
    );

    expect(validation).toMatchObject({ valid: false });
  });
});

describe("requireMcpAuth resource boundary", () => {
  const auth = createSpikeAuth(async () => new Response(null, { status: 500 }));

  it("returns a 401 discovery challenge without a bearer token", async () => {
    const response = await createProtectedMcpEndpoint(auth)(modernRequest());

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      `resource_metadata="https://api.backlog-syntax.example/.well-known/oauth-protected-resource/mcp"`,
    );
  });

  it.each([
    ["wrong issuer", { iss: "https://upstream.example" }, 401],
    ["wrong audience", { aud: "https://another-resource.example/mcp" }, 401],
    ["missing scope", { scope: "profile" }, 403],
  ])("rejects %s", async (_name, overrides, status) => {
    const response = await createProtectedMcpEndpoint(auth)(modernRequest(accessToken(overrides)));
    expect(response.status).toBe(status);
  });

  it("rejects opaque refresh or upstream tokens instead of passing them through", async () => {
    const response = await createProtectedMcpEndpoint(auth)(modernRequest("upstream-refresh-token"));
    expect(response.status).toBe(401);
  });

  it("accepts a local audience-bound token and removes credentials before MCP dispatch", async () => {
    const contexts: Array<Parameters<NonNullable<Parameters<typeof createStrictMcpTransport>[0]>>[0]> = [];
    const transport = createStrictMcpTransport((context) => contexts.push(context));
    const rawToken = accessToken();
    const response = await createProtectedMcpEndpoint(auth, transport)(modernRequest(rawToken));

    expect(response.status, await response.clone().text()).toBe(200);
    expect(contexts).toHaveLength(1);
    expect(contexts[0]?.authInfo).toMatchObject({
      token: REDACTED_TOKEN,
      clientId: "agent-spike",
      scopes: ["mcp:read"],
    });
    expect(contexts[0]?.authInfo?.token).not.toContain(rawToken);
    expect(contexts[0]?.requestInfo?.headers.has("authorization")).toBe(false);
    expect(contexts[0]?.requestInfo?.headers.has("cookie")).toBe(false);

    await transport.close();
  });
});

describe("Hono mounting", () => {
  it("exposes the protected MCP endpoint only on POST", async () => {
    const auth = createSpikeAuth(async () => new Response(null, { status: 500 }));
    const app = createSpikeHonoApp(auth);

    const unauthorized = await app.request(`${AUTH_ORIGIN}/mcp`, { method: "POST" });
    const wrongMethod = await app.request(`${AUTH_ORIGIN}/mcp`, { method: "GET" });

    expect(unauthorized.status).toBe(401);
    expect(wrongMethod.status).toBe(404);
  });
});

describe("MCP 2.0 transport posture", () => {
  it("rejects legacy 2025 requests without constructing a server", async () => {
    const contexts: unknown[] = [];
    const transport = createStrictMcpTransport((context) => contexts.push(context));
    const response = await transport.fetch(
      new Request(MCP_RESOURCE, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
      }),
    );

    expect(response.status).toBe(400);
    expect(contexts).toHaveLength(0);
    expect(await response.text()).toContain(MCP_PROTOCOL_VERSION);
    await transport.close();
  });

  it("constructs a fresh server for each modern request", async () => {
    const contexts: unknown[] = [];
    const transport = createStrictMcpTransport((context) => contexts.push(context));

    const first = await transport.fetch(modernRequest());
    const second = await transport.fetch(modernRequest());

    expect(first.status, await first.clone().text()).toBe(200);
    expect(second.status, await second.clone().text()).toBe(200);
    expect(contexts).toHaveLength(2);
    await transport.close();
  });
});
