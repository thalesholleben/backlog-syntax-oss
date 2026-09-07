import { randomBytes, randomUUID } from "node:crypto";

import { getMigrations } from "better-auth/db/migration";
import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { decodeJwt } from "jose";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  createSpikeAuth,
  createSpikeAuthOptions,
  createSpikeHonoApp,
  type SpikeAuth,
} from "../src/oauth-runtime.mjs";
import {
  AUTH_ISSUER,
  JWKS_URL,
  MCP_PROTOCOL_VERSION,
  MCP_RESOURCE,
  createPkceS256Challenge,
} from "../src/spike.mjs";

const DATABASE_URL = process.env["DATABASE_URL"];
const CLIENT_ID = "https://agent.example/client-metadata.json";
const REDIRECT_URI = "http://127.0.0.1:43111/callback";
const EMAIL = "oauth-spike@example.test";
const PASSWORD = "runtime-only-password-2026";
const realFetch = globalThis.fetch;

const describeWithPostgres = DATABASE_URL ? describe : describe.skip;

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

function clientMetadataResponse(input: string | URL | Request): Promise<Response> {
  const url = input instanceof Request ? input.url : input.toString();
  if (url !== CLIENT_ID) return Promise.resolve(new Response(null, { status: 404 }));

  return Promise.resolve(
    Response.json({
      client_id: CLIENT_ID,
      client_name: "Backlog Syntax runtime test agent",
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "openid offline_access mcp:read",
    }),
  );
}

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .filter((value): value is string => Boolean(value))
    .join("; ");
}

async function redirectFrom(response: Response): Promise<URL> {
  const location = response.headers.get("location");
  if (location) return new URL(location, AUTH_ISSUER);

  const body = (await response.json()) as { url?: unknown };
  if (typeof body.url !== "string") {
    throw new Error(`Expected redirect, received HTTP ${response.status}`);
  }
  return new URL(body.url, AUTH_ISSUER);
}

function modernMcpRequest(token: string): Request {
  return new Request(MCP_RESOURCE, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "mcp-method": "server/discover",
      "mcp-protocol-version": MCP_PROTOCOL_VERSION,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: randomUUID(),
      method: "server/discover",
      params: {
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: MCP_PROTOCOL_VERSION,
          [CLIENT_INFO_META_KEY]: { name: "runtime-test", version: "0.0.0" },
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    }),
  });
}

describeWithPostgres("Better Auth OAuth runtime with PostgreSQL 18", () => {
  let pool: Pool;
  let auth: SpikeAuth;
  let app: ReturnType<typeof createSpikeHonoApp>;
  let sessionCookie = "";

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
    const secret = randomBytes(32).toString("hex");
    const input = { database: pool, secret };
    const options = createSpikeAuthOptions(clientMetadataResponse, input);
    await (await getMigrations(options)).runMigrations();
    auth = createSpikeAuth(clientMetadataResponse, input);
    app = createSpikeHonoApp(auth);
    vi.stubGlobal("fetch", async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url === JWKS_URL) return auth.handler(new Request(JWKS_URL));
      return realFetch(input);
    });

    const signup = await auth.handler(
      new Request(`${AUTH_ISSUER}/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "OAuth Spike", email: EMAIL, password: PASSWORD }),
      }),
    );
    expect(signup.status).toBe(200);
    sessionCookie = cookieHeader(signup);
    expect(sessionCookie).not.toBe("");
  }, 30_000);

  afterAll(async () => {
    vi.unstubAllGlobals();
    await pool?.end();
  });

  async function authorize(
    verifier: string,
    overrides: Record<string, string | undefined> = {},
  ): Promise<Response> {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: "openid offline_access mcp:read",
      resource: MCP_RESOURCE,
      state: randomUUID(),
      code_challenge: createPkceS256Challenge(verifier),
      code_challenge_method: "S256",
    });
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }

    return auth.handler(
      new Request(`${AUTH_ISSUER}/oauth2/authorize?${params}`, {
        headers: { cookie: sessionCookie, accept: "text/html" },
      }),
    );
  }

  async function approve(authorizeResponse: Response): Promise<string> {
    const consentUrl = await redirectFrom(authorizeResponse);
    const callback = consentUrl.pathname === "/consent"
      ? await redirectFrom(
          await auth.handler(
            new Request(`${AUTH_ISSUER}/oauth2/consent`, {
              method: "POST",
              headers: {
                cookie: sessionCookie,
                "content-type": "application/json",
              },
              body: JSON.stringify({ accept: true, oauth_query: consentUrl.search }),
            }),
          ),
        )
      : consentUrl;
    expect(callback.origin + callback.pathname).toBe(REDIRECT_URI);
    expect(callback.searchParams.get("state")).toBeTruthy();
    const code = callback.searchParams.get("code");
    if (!code) throw new Error("Consent callback did not contain an authorization code");
    return code;
  }

  async function exchange(body: Record<string, string>): Promise<Response> {
    return auth.handler(
      new Request(`${AUTH_ISSUER}/oauth2/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
      }),
    );
  }

  it("persists a real user and session in PostgreSQL 18", async () => {
    const version = await pool.query<{ major: string }>(
      "select current_setting('server_version_num')::int / 10000 as major",
    );
    expect(Number(version.rows[0]?.major)).toBe(18);

    const users = await pool.query<{ count: string }>(
      'select count(*) from "user" where email = $1',
      [EMAIL],
    );
    const sessions = await pool.query<{ count: string }>('select count(*) from "session"');
    expect(Number(users.rows[0]?.count)).toBe(1);
    expect(Number(sessions.rows[0]?.count)).toBeGreaterThanOrEqual(1);
  });

  it("rejects missing PKCE, plain PKCE, and an unregistered redirect URI", async () => {
    const verifier = "a".repeat(64);
    const missing = await redirectFrom(await authorize(verifier, { code_challenge: undefined }));
    expect(missing.searchParams.get("error")).toBe("invalid_request");

    const plain = await redirectFrom(
      await authorize(verifier, { code_challenge_method: "plain" }),
    );
    expect(plain.searchParams.get("error")).toBe("invalid_request");

    const badRedirect = await redirectFrom(await authorize(verifier, {
      redirect_uri: "http://127.0.0.1:43111/not-registered",
    }));
    expect(badRedirect.searchParams.get("error")).toMatch(/invalid_redirect/);
  });

  it("completes authorization code + PKCE S256 and protects MCP by scope/audience", async () => {
    const verifier = `v-${randomBytes(48).toString("base64url")}`;
    const code = await approve(await authorize(verifier));

    const wrongVerifier = await exchange({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: `${verifier}-wrong`,
      resource: MCP_RESOURCE,
    });
    expect(wrongVerifier.status).toBe(401);

    const freshCode = await approve(await authorize(verifier));
    const tokenResponse = await exchange({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code: freshCode,
      code_verifier: verifier,
      resource: MCP_RESOURCE,
    });
    expect(tokenResponse.status).toBe(200);
    const tokens = (await tokenResponse.json()) as TokenResponse;
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();

    const claims = decodeJwt(tokens.access_token);
    expect(claims.iss).toBe(AUTH_ISSUER);
    expect(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).toContain(MCP_RESOURCE);
    expect(claims["scope"]).toContain("mcp:read");

    const accepted = await app.fetch(modernMcpRequest(tokens.access_token));
    expect(accepted.status).toBe(200);

    const noMcpVerifier = `s-${randomBytes(48).toString("base64url")}`;
    const noMcpCode = await approve(
      await authorize(noMcpVerifier, { scope: "openid offline_access" }),
    );
    const noMcpResponse = await exchange({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code: noMcpCode,
      code_verifier: noMcpVerifier,
      resource: MCP_RESOURCE,
    });
    expect(noMcpResponse.status).toBe(200);
    const noMcpTokens = (await noMcpResponse.json()) as TokenResponse;
    const deniedScope = await app.fetch(modernMcpRequest(noMcpTokens.access_token));
    expect(deniedScope.status).toBe(403);

    const wrongAudience = await redirectFrom(await authorize(verifier, {
      resource: "https://other.example/mcp",
    }));
    expect(wrongAudience.searchParams.get("error")).toBe("invalid_target");

    const firstRefresh = await exchange({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: tokens.refresh_token,
      resource: MCP_RESOURCE,
    });
    expect(firstRefresh.status).toBe(200);
    const rotated = (await firstRefresh.json()) as TokenResponse;
    expect(rotated.refresh_token).not.toBe(tokens.refresh_token);

    const reuseWithinGrace = await exchange({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: tokens.refresh_token,
      resource: MCP_RESOURCE,
    });
    expect(reuseWithinGrace.status).toBe(200);
    const replay = (await reuseWithinGrace.json()) as TokenResponse;
    expect(replay.refresh_token).toBe(rotated.refresh_token);

    const consentRows = await pool.query<{ count: string }>('select count(*) from "oauthConsent"');
    expect(Number(consentRows.rows[0]?.count)).toBeGreaterThanOrEqual(1);
  }, 30_000);
});
