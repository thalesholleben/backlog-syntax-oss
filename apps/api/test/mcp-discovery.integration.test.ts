import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  TaskListSchema,
  WorkspaceContextSchema,
  WorkspaceListSchema,
  WorkspaceSchema,
  type Workspace,
} from "@backlog-syntax/contracts";
import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createProductApp } from "../src/app.js";
import { parseConfig } from "../src/config.js";
import { createDatabasePools, type DatabasePools } from "../src/infrastructure/database-pools.js";

const integration = process.env["RUN_PRODUCT_INTEGRATION"] === "true" ? describe : describe.skip;
const WEB_ORIGIN = "https://web.integration.test";
const API_ORIGIN = "https://api.integration.test";
const RUN_ID = randomBytes(4).toString("hex");
const CLIENT_ID = `https://discovery-agent.integration.test/${RUN_ID}/client-metadata.json`;
const REDIRECT_URI = "http://127.0.0.1:43113/discovery-callback";
const MCP_VERSION = "2026-07-28";

interface Actor {
  id: string;
  cookie: string;
  token: string;
  workspaces: Workspace[];
}

interface RpcResponse {
  result?: {
    structuredContent?: unknown;
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
    tools?: Array<{ name: string; inputSchema: { required?: string[]; properties?: object } }>;
  };
  error?: unknown;
}

integration("MCP workspace discovery with verified OAuth and PostgreSQL", () => {
  let pools: DatabasePools;
  let app: ReturnType<typeof createProductApp>;
  const actors = new Map<number, Actor>();
  const realFetch = globalThis.fetch;

  const actor = (count: number): Actor => {
    const value = actors.get(count);
    if (!value) throw new Error(`Missing discovery fixture ${count}`);
    return value;
  };
  const request = (path: string, init?: RequestInit) => app.request(`${API_ORIGIN}${path}`, init);
  const jsonRequest = (path: string, cookie: string, method: string, body?: unknown) =>
    request(path, {
      method,
      headers: { cookie, origin: WEB_ORIGIN, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  const redirectFrom = async (response: Response): Promise<URL> => {
    const location = response.headers.get("location");
    if (location) return new URL(location, API_ORIGIN);
    const payload = (await response.json()) as { url?: string };
    if (!payload.url) throw new Error(`Expected redirect from HTTP ${response.status}`);
    return new URL(payload.url, API_ORIGIN);
  };

  const authorize = async (cookie: string, scope = "openid read"): Promise<string> => {
    const verifier = randomBytes(48).toString("base64url");
    const query = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope,
      resource: `${API_ORIGIN}/mcp`,
      state: randomUUID(),
      code_challenge: createHash("sha256").update(verifier, "ascii").digest("base64url"),
      code_challenge_method: "S256",
    });
    const consent = await redirectFrom(
      await request(`/api/auth/oauth2/authorize?${query}`, {
        headers: { cookie, accept: "text/html" },
      }),
    );
    const callback =
      consent.pathname === "/consent"
        ? await redirectFrom(
            await jsonRequest("/api/auth/oauth2/consent", cookie, "POST", {
              accept: true,
              oauth_query: consent.search,
            }),
          )
        : consent;
    const code = callback.searchParams.get("code");
    expect(code).toBeTruthy();
    const response = await request("/api/auth/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code: code ?? "",
        code_verifier: verifier,
        resource: `${API_ORIGIN}/mcp`,
      }),
    });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { access_token: string };
    expect(typeof payload.access_token).toBe("string");
    return payload.access_token;
  };

  const rpc = (token: string, method: string, params: Record<string, unknown> = {}) =>
    request("/mcp", {
      method: "POST",
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        host: "api.integration.test",
        "content-type": "application/json",
        "mcp-method": method,
        ...(typeof params["name"] === "string" ? { "mcp-name": params["name"] } : {}),
        "mcp-protocol-version": MCP_VERSION,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: randomUUID(),
        method,
        params: {
          ...params,
          _meta: {
            [PROTOCOL_VERSION_META_KEY]: MCP_VERSION,
            [CLIENT_INFO_META_KEY]: { name: "discovery-test-agent", version: "0.1.0" },
            [CLIENT_CAPABILITIES_META_KEY]: {},
          },
        },
      }),
    });

  const callTool = async (token: string, name: string, args?: Record<string, unknown>) => {
    const response = await rpc(token, "tools/call", {
      name,
      ...(args === undefined ? {} : { arguments: args }),
    });
    expect(response.status).toBe(200);
    return (await response.json()) as RpcResponse;
  };

  const listWorkspaces = async (token: string, args?: Record<string, unknown>) => {
    const payload = await callTool(token, "list_workspaces", args);
    expect(payload.error).toBeUndefined();
    expect(payload.result?.isError).not.toBe(true);
    expect(payload.result?.content?.[0]?.text).toContain("untrusted data");
    return WorkspaceListSchema.parse(payload.result?.structuredContent);
  };

  beforeAll(async () => {
    const config = parseConfig({
      NODE_ENV: "test",
      WEB_ORIGIN,
      PUBLIC_API_URL: API_ORIGIN,
      // Both integration files share the issuer's encrypted JWKS in the disposable database.
      AUTH_SECRET:
        process.env["INTEGRATION_AUTH_SECRET"] ?? "integration-auth-secret-at-least-32-characters",
      AUTH_DATABASE_URL: process.env["INTEGRATION_AUTH_DATABASE_URL"],
      APP_DATABASE_URL: process.env["INTEGRATION_APP_DATABASE_URL"],
      DATABASE_SSL: "false",
      HOUSEKEEPING_ENABLED: "false",
    });
    pools = createDatabasePools(config);
    app = createProductApp({
      config,
      pools,
      authOptions: {
        fetchClientMetadataResource: async (input) => {
          const url = input instanceof Request ? input.url : input.toString();
          if (url !== CLIENT_ID) return new Response(null, { status: 404 });
          return Response.json({
            client_id: CLIENT_ID,
            client_name: "Workspace discovery integration test",
            redirect_uris: [REDIRECT_URI],
            token_endpoint_auth_method: "none",
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            scope: "openid read write",
          });
        },
      },
    });
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url === `${API_ORIGIN}/api/auth/jwks`) return app.request(url, init);
      return realFetch(input, init);
    });
    for (const count of [0, 1, 2]) {
      const signup = await jsonRequest("/api/auth/sign-up/email", "", "POST", {
        name: `Discovery ${count}`,
        email: `discovery-${RUN_ID}-${count}@integration.test`,
        password: "Discovery-test-password-2026",
        termsAcceptedAt: new Date().toISOString(),
        privacyNoticeAcceptedAt: new Date().toISOString(),
        legalNoticeVersion: "2026-08-31",
      });
      expect(signup.status).toBe(200);
      const cookie = signup.headers
        .getSetCookie()
        .map((value) => value.split(";", 1)[0])
        .join("; ");
      const user = ((await signup.json()) as { user: { id: string } }).user;
      const workspaces: Workspace[] = [];
      for (let index = 0; index < count; index++) {
        const created = await jsonRequest("/v1/workspaces", cookie, "POST", {
          name: `Discovery ${count} workspace ${index}`,
          slug: `discovery-${RUN_ID}-${count}-${index}`,
        });
        expect(created.status).toBe(201);
        workspaces.push(WorkspaceSchema.parse(await created.json()));
      }
      actors.set(count, { id: user.id, cookie, workspaces, token: await authorize(cookie) });
    }
  }, 30_000);

  afterAll(async () => {
    vi.unstubAllGlobals();
    await pools?.close();
  });

  it("advertises eleven tools and no mandatory workspace selector for discovery", async () => {
    const response = await rpc(actor(0).token, "tools/list");
    expect(response.status).toBe(200);
    const payload = (await response.json()) as RpcResponse;
    expect(payload.error).toBeUndefined();
    expect(payload.result?.tools).toHaveLength(11);
    const tool = payload.result?.tools?.find((value) => value.name === "list_workspaces");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required ?? []).toEqual([]);
    expect(tool?.inputSchema.properties).not.toHaveProperty("workspaceId");
  });

  it.each([0, 1, 2])("discovers only the authenticated user's %i workspaces", async (count) => {
    const principal = actor(count);
    const list = await listWorkspaces(principal.token, {});
    expect(list.data).toEqual([...principal.workspaces].sort((a, b) => a.id.localeCompare(b.id)));
    expect(list.page).toEqual({ hasMore: false, nextCursor: null });
  });

  it("bootstraps context and tasks using only a discovered ID with arguments omitted", async () => {
    const list = await listWorkspaces(actor(1).token);
    const workspaceId = list.data[0]?.id;
    expect(workspaceId).toBeDefined();
    const context = await callTool(actor(1).token, "get_workspace_context", { workspaceId });
    expect(context.error).toBeUndefined();
    const value = WorkspaceContextSchema.parse(context.result?.structuredContent);
    expect(value.workspace.id).toBe(workspaceId);
    expect(value.principal.subjectId).toBe(actor(1).id);
    const tasks = await callTool(actor(1).token, "list_tasks", { workspaceId });
    expect(tasks.error).toBeUndefined();
    expect(TaskListSchema.parse(tasks.result?.structuredContent).data).toEqual([]);
  });

  it("paginates without duplicates and never grants access through another user's cursor", async () => {
    const first = await listWorkspaces(actor(2).token, { limit: 1 });
    expect(first.data).toHaveLength(1);
    expect(first.page.hasMore).toBe(true);
    expect(first.page.nextCursor).toEqual(expect.any(String));
    const second = await listWorkspaces(actor(2).token, {
      limit: 1,
      cursor: first.page.nextCursor,
    });
    expect(second.page).toEqual({ hasMore: false, nextCursor: null });
    expect([...first.data, ...second.data].map((item) => item.id)).toEqual(
      actor(2)
        .workspaces.map((item) => item.id)
        .sort(),
    );
    const foreignCursor = await listWorkspaces(actor(0).token, { cursor: first.page.nextCursor });
    expect(foreignCursor.data).toEqual([]);
  });

  it("rejects explicit foreign workspace access after discovery", async () => {
    const foreign = await listWorkspaces(actor(2).token);
    const result = await callTool(actor(1).token, "get_workspace_context", {
      workspaceId: foreign.data[0]?.id,
    });
    expect(result.result?.isError).toBe(true);
    expect(result.result?.content?.[0]?.text).toContain("Workspace not found");
    expect(result.result?.structuredContent).toBeUndefined();
  });

  it("rejects missing authentication and a verified token without read scope", async () => {
    const anonymous = await rpc("", "tools/call", { name: "list_workspaces", arguments: {} });
    expect(anonymous.status).toBe(401);
    const noRead = await authorize(actor(0).cookie, "openid");
    const denied = await rpc(noRead, "tools/call", { name: "list_workspaces", arguments: {} });
    expect(denied.status).toBe(403);
  });

  it("rejects identity injection, out-of-range limits and malformed cursors", async () => {
    for (const args of [
      { subjectId: actor(2).id },
      { workspaceId: actor(2).workspaces[0]?.id },
      { principal: { subjectType: "user", subjectId: actor(2).id } },
      { limit: 0 },
      { limit: 101 },
      { limit: true },
      { limit: "100" },
      { cursor: "not-a-cursor" },
    ]) {
      const payload = await callTool(actor(1).token, "list_workspaces", args);
      expect(payload.result?.isError).toBe(true);
      expect(payload.result?.content?.[0]?.text).toMatch(
        /Unrecognized key|Too small|Too big|expected number|Invalid pagination cursor/,
      );
      expect(payload.result?.structuredContent).toBeUndefined();
    }
  });
});
