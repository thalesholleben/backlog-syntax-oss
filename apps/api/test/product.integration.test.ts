import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createProductApp } from "../src/app.js";
import { createProductAuth } from "../src/auth/runtime.mjs";
import { parseConfig, type ApiConfig } from "../src/config.js";
import { createDatabasePools, type DatabasePools } from "../src/infrastructure/database-pools.js";
import { startLeaseHousekeeping } from "../src/worker/lease-housekeeping.js";

const enabled = process.env["RUN_PRODUCT_INTEGRATION"] === "true";
const integration = enabled ? describe.sequential : describe.skip;
const WEB_ORIGIN = "https://web.integration.test";
const API_ORIGIN = "https://api.integration.test";
const CLIENT_ID = "https://agent.integration.test/client-metadata.json";
const REDIRECT_URI = "http://127.0.0.1:43112/callback";
const MCP_VERSION = "2026-07-28";
const AUTH_SECRET =
  process.env["INTEGRATION_AUTH_SECRET"] ?? "integration-auth-secret-at-least-32-characters";
const RUN_ID = randomBytes(4).toString("hex");
const FIRST_EMAIL = `first-user-${RUN_ID}@integration.test`;
const SECOND_EMAIL = `second-user-${RUN_ID}@integration.test`;
const UNACCEPTED_EMAIL = `social-user-${RUN_ID}@integration.test`;

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .filter((value): value is string => Boolean(value))
    .join("; ");
}

function pkce(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

async function redirectFrom(response: Response): Promise<URL> {
  const location = response.headers.get("location");
  if (location) return new URL(location, API_ORIGIN);
  const payload = (await response.json()) as { url?: unknown };
  if (typeof payload.url !== "string") {
    throw new Error(`Expected redirect from HTTP ${response.status}`);
  }
  return new URL(payload.url, API_ORIGIN);
}

integration("product runtime with PostgreSQL 18", () => {
  let config: ApiConfig;
  let pools: DatabasePools;
  let app: ReturnType<typeof createProductApp>;
  let firstCookie = "";
  let secondCookie = "";
  let unacceptedCookie = "";
  let firstWorkspace = "";
  let secondWorkspace = "";
  let projectId = "";
  let restTaskId = "";
  let mcpTaskId = "";
  const realFetch = globalThis.fetch;

  const request = (path: string, init?: RequestInit) => app.request(`${API_ORIGIN}${path}`, init);
  const jsonRequest = (
    path: string,
    cookie: string,
    method: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    request(path, {
      method,
      headers: {
        cookie,
        origin: WEB_ORIGIN,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  beforeAll(async () => {
    config = parseConfig({
      NODE_ENV: "test",
      WEB_ORIGIN,
      PUBLIC_API_URL: API_ORIGIN,
      AUTH_SECRET,
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
            client_name: "Backlog Syntax integration agent",
            redirect_uris: [REDIRECT_URI],
            token_endpoint_auth_method: "none",
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            scope: "openid offline_access read write",
          });
        },
      },
    });
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url === `${API_ORIGIN}/api/auth/jwks`) return app.request(url, init);
      return realFetch(input, init);
    });

    const signup = async (email: string, accepted = true) => {
      const response = await request("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: WEB_ORIGIN },
        body: JSON.stringify({
          name: email.split("@")[0],
          email,
          password: "Integration-password-2026",
          ...(accepted
            ? {
                termsAcceptedAt: new Date().toISOString(),
                privacyNoticeAcceptedAt: new Date().toISOString(),
                legalNoticeVersion: "2026-08-31",
              }
            : {}),
        }),
      });
      expect(response.status, await response.clone().text()).toBe(200);
      return cookieHeader(response);
    };
    firstCookie = await signup(FIRST_EMAIL);
    secondCookie = await signup(SECOND_EMAIL);
    unacceptedCookie = await signup(UNACCEPTED_EMAIL, false);
  }, 30_000);

  afterAll(async () => {
    vi.unstubAllGlobals();
    await pools?.close();
  });

  it("creates real sessions with a host-only secure cookie and exact Origin", async () => {
    expect(firstCookie).toMatch(/^__Host-backlog_session=/);
    const session = await request("/api/auth/get-session", { headers: { cookie: firstCookie } });
    expect(session.status).toBe(200);
    expect((await session.json()) as object).toHaveProperty("user.email", FIRST_EMAIL);

    const rejected = await request("/v1/workspaces", {
      method: "POST",
      headers: { cookie: firstCookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "No Origin", slug: "no-origin" }),
    });
    expect(rejected.status).toBe(403);
    expect(rejected.headers.get("access-control-allow-origin")).not.toBe("https://attacker.test");

    const createWorkspace = async (cookie: string, name: string, slug: string) => {
      const response = await jsonRequest("/v1/workspaces", cookie, "POST", { name, slug });
      expect(response.status, await response.clone().text()).toBe(201);
      return ((await response.json()) as { id: string }).id;
    };
    firstWorkspace = await createWorkspace(firstCookie, "First workspace", `first-${RUN_ID}`);
    secondWorkspace = await createWorkspace(secondCookie, "Second workspace", `second-${RUN_ID}`);

    const project = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/projects`,
      firstCookie,
      "POST",
      { name: "Core", slug: "core" },
      { "idempotency-key": "project-core-0001" },
    );
    expect(project.status).toBe(201);
    projectId = ((await project.json()) as { id: string }).id;
  });

  it("feature-flags Google and blocks product access until legal acceptance", async () => {
    const disabled = await request("/api/auth/sign-in/social", {
      method: "POST",
      headers: { "content-type": "application/json", origin: WEB_ORIGIN },
      body: JSON.stringify({ provider: "google", callbackURL: `${WEB_ORIGIN}/aceitar-termos` }),
    });
    expect(disabled.status).toBe(404);

    const configuredAuth = createProductAuth(pools.auth, {
      ...config,
      GOOGLE_CLIENT_ID: "google-client-id.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
    });
    const configured = await configuredAuth.handler(
      new Request(`${API_ORIGIN}/api/auth/sign-in/social`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: WEB_ORIGIN },
        body: JSON.stringify({
          provider: "google",
          callbackURL: `${WEB_ORIGIN}/aceitar-termos`,
        }),
      }),
    );
    expect(configured.status, await configured.clone().text()).toBe(200);
    expect(((await configured.json()) as { url: string }).url).toContain("accounts.google.com");

    const blocked = await jsonRequest("/v1/workspaces", unacceptedCookie, "POST", {
      name: "Blocked before acceptance",
      slug: `blocked-${RUN_ID}`,
    });
    expect(blocked.status).toBe(401);

    const acceptedAt = new Date().toISOString();
    const acceptance = await request("/api/auth/update-user", {
      method: "POST",
      headers: {
        cookie: unacceptedCookie,
        origin: WEB_ORIGIN,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        termsAcceptedAt: acceptedAt,
        privacyNoticeAcceptedAt: acceptedAt,
        legalNoticeVersion: "2026-08-31",
      }),
    });
    expect(acceptance.status, await acceptance.clone().text()).toBe(200);
    const allowed = await jsonRequest("/v1/workspaces", unacceptedCookie, "POST", {
      name: "Accepted social workspace",
      slug: `accepted-${RUN_ID}`,
    });
    expect(allowed.status, await allowed.clone().text()).toBe(201);
  });

  it("blocks BOLA and enforces tenant-bound PAT scopes", async () => {
    const bola = await request(`/v1/workspaces/${secondWorkspace}/tasks`, {
      headers: { cookie: firstCookie },
    });
    expect(bola.status).toBe(404);

    const serviceAccount = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/service-accounts`,
      firstCookie,
      "POST",
      { name: "Read agent" },
    );
    expect(serviceAccount.status).toBe(201);
    const serviceAccountId = ((await serviceAccount.json()) as { id: string }).id;
    const createdToken = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/api-tokens`,
      firstCookie,
      "POST",
      { serviceAccountId, name: "Read only", scopes: ["read"] },
    );
    expect(createdToken.status).toBe(201);
    const tokenPayload = (await createdToken.json()) as {
      token: string;
      metadata: { prefix: string };
    };
    expect(tokenPayload.token).toMatch(/^bks_[A-Za-z0-9_-]{8,64}\.[A-Za-z0-9_-]{32,128}$/);
    expect(JSON.stringify(tokenPayload.metadata)).not.toContain(tokenPayload.token);

    const own = await request(`/v1/workspaces/${firstWorkspace}/tasks`, {
      headers: { authorization: `Bearer ${tokenPayload.token}` },
    });
    expect(own.status).toBe(200);
    const other = await request(`/v1/workspaces/${secondWorkspace}/tasks`, {
      headers: { authorization: `Bearer ${tokenPayload.token}` },
    });
    expect(other.status).toBe(404);
    const forbiddenWrite = await request(`/v1/workspaces/${firstWorkspace}/tasks`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenPayload.token}`,
        "content-type": "application/json",
        "idempotency-key": "pat-write-denied",
      },
      body: JSON.stringify({ projectId, title: "Denied", priority: "medium" }),
    });
    expect(forbiddenWrite.status).toBe(403);
  });

  it("runs REST list, claim, evidence, complete with stale and idempotency protection", async () => {
    const createBody = {
      projectId,
      title: "REST vertical slice",
      priority: "high",
      scheduledDate: "2026-09-08",
      dueDate: "2026-09-10",
    };
    const create = () =>
      jsonRequest(`/v1/workspaces/${firstWorkspace}/tasks`, firstCookie, "POST", createBody, {
        "idempotency-key": "rest-task-create-0001",
      });
    const first = await create();
    const replay = await create();
    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    restTaskId = ((await first.json()) as { id: string }).id;
    expect(((await replay.json()) as { id: string }).id).toBe(restTaskId);

    const conflict = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks`,
      firstCookie,
      "POST",
      { ...createBody, title: "Different payload" },
      { "idempotency-key": "rest-task-create-0001" },
    );
    expect(conflict.status).toBe(409);

    const listed = await request(`/v1/workspaces/${firstWorkspace}/tasks`, {
      headers: { cookie: firstCookie },
    });
    expect(listed.status).toBe(200);
    const listedTask = (
      (await listed.json()) as {
        data: Array<{ id: string; scheduledDate: string | null; dueDate: string | null }>;
      }
    ).data.find((task) => task.id === restTaskId);
    expect(listedTask).toMatchObject({
      scheduledDate: "2026-09-08",
      dueDate: "2026-09-10",
    });

    const claim = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks/${restTaskId}/claim`,
      firstCookie,
      "POST",
      { leaseSeconds: 600 },
      { "if-match": '"1"', "idempotency-key": "rest-claim-0001" },
    );
    expect(claim.status).toBe(200);
    const evidence = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks/${restTaskId}/events`,
      firstCookie,
      "POST",
      { eventType: "evidence", content: "REST evidence" },
      { "if-match": '"2"', "idempotency-key": "rest-evidence-0001" },
    );
    expect(evidence.status).toBe(201);
    const complete = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks/${restTaskId}`,
      firstCookie,
      "PATCH",
      { status: "done" },
      { "if-match": '"3"', "idempotency-key": "rest-complete-0001" },
    );
    expect(complete.status).toBe(200);
    expect((await complete.json()) as object).toHaveProperty("status", "done");
    const stale = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks/${restTaskId}`,
      firstCookie,
      "PATCH",
      { title: "Stale" },
      { "if-match": '"3"', "idempotency-key": "rest-stale-0001" },
    );
    expect(stale.status).toBe(409);
  });

  it("accepts the largest valid multibyte task and rejects an oversized body before parsing", async () => {
    const valid = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks`,
      firstCookie,
      "POST",
      {
        projectId,
        title: "Limite multibyte válido",
        description: "界".repeat(50_000),
        priority: "medium",
      },
      { "idempotency-key": "task-cjk-limit-0001" },
    );
    expect(valid.status).toBe(201);

    const oversized = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks`,
      firstCookie,
      "POST",
      {
        projectId,
        title: "Corpo grande demais",
        description: "x".repeat(600 * 1024),
        priority: "medium",
      },
      { "idempotency-key": "task-over-limit-0001" },
    );
    const problem = (await oversized.json()) as { code: string; status: number; traceId: string };
    expect(oversized.status).toBe(413);
    expect(oversized.headers.get("content-type")).toContain("application/problem+json");
    expect(problem).toMatchObject({ status: 413, code: "payload_too_large" });
    expect(problem.traceId).toBeTruthy();
  });

  it("runs the equivalent MCP slice with a Better Auth OAuth token", async () => {
    const create = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks`,
      firstCookie,
      "POST",
      { projectId, title: "MCP vertical slice", priority: "high" },
      { "idempotency-key": "mcp-task-seed-0001" },
    );
    expect(create.status).toBe(201);
    mcpTaskId = ((await create.json()) as { id: string }).id;

    const verifier = `v-${randomBytes(48).toString("base64url")}`;
    const query = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: "openid offline_access read write",
      resource: `${API_ORIGIN}/mcp`,
      state: randomUUID(),
      code_challenge: pkce(verifier),
      code_challenge_method: "S256",
    });
    const authorize = await request(`/api/auth/oauth2/authorize?${query}`, {
      headers: { cookie: firstCookie, accept: "text/html" },
    });
    const consentUrl = await redirectFrom(authorize);
    const callback =
      consentUrl.pathname === "/consent"
        ? await redirectFrom(
            await request("/api/auth/oauth2/consent", {
              method: "POST",
              headers: {
                cookie: firstCookie,
                origin: WEB_ORIGIN,
                "content-type": "application/json",
              },
              body: JSON.stringify({ accept: true, oauth_query: consentUrl.search }),
            }),
          )
        : consentUrl;
    const code = callback.searchParams.get("code");
    expect(code).toBeTruthy();
    const tokenResponse = await request("/api/auth/oauth2/token", {
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
    expect(tokenResponse.status).toBe(200);
    const tokens = (await tokenResponse.json()) as TokenResponse;

    const unauthorized = await request("/mcp", {
      method: "POST",
      headers: {
        host: "api.integration.test",
        "content-type": "application/json",
        "mcp-method": "server/discover",
        "mcp-protocol-version": MCP_VERSION,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "unauthorized-discover",
        method: "server/discover",
        params: {
          _meta: {
            [PROTOCOL_VERSION_META_KEY]: MCP_VERSION,
            [CLIENT_INFO_META_KEY]: { name: "integration-agent", version: "0.1.0" },
            [CLIENT_CAPABILITIES_META_KEY]: {},
          },
        },
      }),
    });
    expect(unauthorized.status, await unauthorized.clone().text()).toBe(401);
    expect(unauthorized.headers.get("www-authenticate")).toContain("resource_metadata");

    const callTool = async (id: string, name: string, args: Record<string, unknown>) => {
      const response = await request("/mcp", {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokens.access_token}`,
          host: "api.integration.test",
          "content-type": "application/json",
          "mcp-method": "tools/call",
          "mcp-name": name,
          "mcp-protocol-version": MCP_VERSION,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id,
          method: "tools/call",
          params: {
            name,
            arguments: args,
            _meta: {
              [PROTOCOL_VERSION_META_KEY]: MCP_VERSION,
              [CLIENT_INFO_META_KEY]: { name: "integration-agent", version: "0.1.0" },
              [CLIENT_CAPABILITIES_META_KEY]: {},
            },
          },
        }),
      });
      expect(response.status, await response.clone().text()).toBe(200);
      const payload = (await response.json()) as {
        result?: { structuredContent?: unknown };
        error?: unknown;
      };
      expect(payload.error).toBeUndefined();
      return payload.result?.structuredContent;
    };

    const list = (await callTool("mcp-list-1", "list_tasks", {
      workspaceId: firstWorkspace,
      limit: 20,
    })) as { data: Array<{ id: string }> };
    expect(list.data.some((task) => task.id === mcpTaskId)).toBe(true);
    await callTool("mcp-claim-1", "claim_task", {
      workspaceId: firstWorkspace,
      taskId: mcpTaskId,
      expectedVersion: 1,
      leaseSeconds: 600,
    });
    await callTool("mcp-evidence-1", "record_task_event", {
      workspaceId: firstWorkspace,
      taskId: mcpTaskId,
      expectedVersion: 2,
      eventType: "evidence",
      content: "MCP evidence",
    });
    const completed = (await callTool("mcp-complete-1", "update_task", {
      workspaceId: firstWorkspace,
      taskId: mcpTaskId,
      expectedVersion: 3,
      patch: { status: "done" },
    })) as { status: string };
    expect(completed.status).toBe("done");
  }, 30_000);

  it("expires stale leases through the advisory-lock worker", async () => {
    const created = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks`,
      firstCookie,
      "POST",
      { projectId, title: "Lease expiry", priority: "medium" },
      { "idempotency-key": "lease-task-0001" },
    );
    const taskId = ((await created.json()) as { id: string }).id;
    const claim = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks/${taskId}/claim`,
      firstCookie,
      "POST",
      { leaseSeconds: 60 },
      { "if-match": '"1"', "idempotency-key": "lease-claim-0001" },
    );
    expect(claim.status).toBe(200);
    const session = await request("/api/auth/get-session", { headers: { cookie: firstCookie } });
    const userId = ((await session.json()) as { user: { id: string } }).user.id;
    const client = await pools.app.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT private.set_request_context($1::uuid, 'user', $2::uuid)", [
        firstWorkspace,
        userId,
      ]);
      await client.query(
        `UPDATE domain.task_claims
         SET claimed_at = now() - interval '2 minutes',
             lease_expires_at = now() - interval '1 minute'
         WHERE tenant_id = $1::uuid AND task_id = $2::uuid`,
        [firstWorkspace, taskId],
      );
      await client.query(
        `UPDATE domain.idempotency_keys
         SET expires_at = now() - interval '1 minute'
         WHERE tenant_id = $1::uuid AND idempotency_key = 'lease-claim-0001'`,
        [firstWorkspace],
      );
      await client.query("COMMIT");
    } finally {
      client.release();
    }
    const stop = startLeaseHousekeeping(pools.app, 1_000);
    await vi.waitFor(
      async () => {
        const reclaimed = await jsonRequest(
          `/v1/workspaces/${firstWorkspace}/tasks/${taskId}/claim`,
          firstCookie,
          "POST",
          { leaseSeconds: 60 },
          { "if-match": '"2"', "idempotency-key": `lease-reclaim-${randomUUID()}` },
        );
        expect(reclaimed.status).toBe(200);
        const verification = await pools.app.connect();
        try {
          await verification.query("BEGIN");
          await verification.query(
            "SELECT private.set_request_context($1::uuid, 'user', $2::uuid)",
            [firstWorkspace, userId],
          );
          const expired = await verification.query<{ count: string }>(
            `SELECT count(*)::text AS count
             FROM domain.idempotency_keys
             WHERE tenant_id = $1::uuid AND idempotency_key = 'lease-claim-0001'`,
            [firstWorkspace],
          );
          await verification.query("COMMIT");
          expect(expired.rows[0]?.count).toBe("0");
        } finally {
          verification.release();
        }
      },
      { timeout: 5_000, interval: 250 },
    );
    stop();
  });

  it("records task authorship, serves the execution queue and rate limits the poller", async () => {
    const firstSession = await request("/api/auth/get-session", {
      headers: { cookie: firstCookie },
    });
    const firstUserId = ((await firstSession.json()) as { user: { id: string } }).user.id;

    // O balde e por principal e a janela e de 60s, entao um teste que faz varios polls
    // esgota o orcamento. Limpar entre as fases mantem cada criterio medido isolado,
    // em vez de um criterio mascarar o outro.
    const resetQueueBudget = async () => {
      const client = await pools.app.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT private.set_request_context($1::uuid, 'user', $2::uuid)", [
          firstWorkspace,
          firstUserId,
        ]);
        await client.query("DELETE FROM domain.rate_limits WHERE tenant_id = $1::uuid", [
          firstWorkspace,
        ]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    };

    // A1: autoria de usuario, gravada pelo servidor a partir do principal autenticado.
    const byUser = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks`,
      firstCookie,
      "POST",
      { projectId, title: "Authored by the signed-in user", priority: "medium" },
      { "idempotency-key": `authorship-user-${RUN_ID}` },
    );
    expect(byUser.status, await byUser.clone().text()).toBe(201);
    const userTask = (await byUser.json()) as {
      id: string;
      createdBy: { subjectType: string; subjectId: string } | null;
    };
    expect(userTask.createdBy).toEqual({ subjectType: "user", subjectId: firstUserId });

    // A1: autoria de service account, pelo mesmo caminho, com token proprio.
    const agentAccount = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/service-accounts`,
      firstCookie,
      "POST",
      { name: "Queue agent" },
    );
    expect(agentAccount.status).toBe(201);
    const agentAccountId = ((await agentAccount.json()) as { id: string }).id;
    const agentToken = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/api-tokens`,
      firstCookie,
      "POST",
      { serviceAccountId: agentAccountId, name: "Queue token", scopes: ["read", "write"] },
    );
    expect(agentToken.status).toBe(201);
    const agentBearer = ((await agentToken.json()) as { token: string }).token;

    const byAgent = await request(`/v1/workspaces/${firstWorkspace}/tasks`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${agentBearer}`,
        "content-type": "application/json",
        "idempotency-key": `authorship-agent-${RUN_ID}`,
      },
      body: JSON.stringify({ projectId, title: "Authored by the agent", priority: "medium" }),
    });
    expect(byAgent.status, await byAgent.clone().text()).toBe(201);
    const agentTask = (await byAgent.json()) as {
      id: string;
      createdBy: { subjectType: string; subjectId: string } | null;
    };
    expect(agentTask.createdBy).toEqual({
      subjectType: "service_account",
      subjectId: agentAccountId,
    });

    // A2: autoria nao e forjavel pelo corpo. O schema e .strict(), e a politica de
    // validacao do servidor responde 422, nao 400.
    const forged = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks`,
      firstCookie,
      "POST",
      {
        projectId,
        title: "Forged authorship",
        priority: "medium",
        createdBy: { subjectType: "user", subjectId: firstUserId },
      },
      { "idempotency-key": `authorship-forged-${RUN_ID}` },
    );
    expect(forged.status).toBe(422);
    expect((await forged.json()) as object).toHaveProperty("code", "invalid_request");

    // A3: tarefa anterior a esta versao nao tem autor atribuivel e continua legivel.
    const legacyClient = await pools.app.connect();
    let legacyTaskId = "";
    try {
      await legacyClient.query("BEGIN");
      await legacyClient.query("SELECT private.set_request_context($1::uuid, 'user', $2::uuid)", [
        firstWorkspace,
        firstUserId,
      ]);
      const inserted = await legacyClient.query<{ task_id: string }>(
        `INSERT INTO domain.tasks (tenant_id, project_id, title, priority)
         VALUES ($1::uuid, $2::uuid, 'Task created before authorship existed', 'medium')
         RETURNING task_id`,
        [firstWorkspace, projectId],
      );
      legacyTaskId = inserted.rows[0]?.task_id ?? "";
      await legacyClient.query("COMMIT");
    } catch (error) {
      await legacyClient.query("ROLLBACK");
      throw error;
    } finally {
      legacyClient.release();
    }
    expect(legacyTaskId).not.toBe("");
    const legacyRead = await request(`/v1/workspaces/${firstWorkspace}/tasks/${legacyTaskId}`, {
      headers: { cookie: firstCookie },
    });
    expect(legacyRead.status).toBe(200);
    expect((await legacyRead.json()) as object).toHaveProperty("createdBy", null);

    // B1: a fila devolve as tarefas abertas e sem claim ativo do projeto.
    await resetQueueBudget();
    const queueUrl = `/v1/workspaces/${firstWorkspace}/task-queue?projectId=${projectId}`;
    const firstPoll = await request(queueUrl, { headers: { cookie: firstCookie } });
    expect(firstPoll.status, await firstPoll.clone().text()).toBe(200);
    const queued = ((await firstPoll.json()) as { data: Array<{ id: string; status: string }> })
      .data;
    expect(queued.every((task) => task.status === "open")).toBe(true);
    expect(queued.map((task) => task.id)).toContain(userTask.id);

    // C1: a segunda chamada do MESMO principal, dentro da janela, e recusada com o
    // tempo de espera anunciado.
    const throttled = await request(queueUrl, { headers: { cookie: firstCookie } });
    expect(throttled.status).toBe(429);
    expect((await throttled.clone().json()) as object).toHaveProperty("code", "rate_limited");
    const retryAfter = Number(throttled.headers.get("retry-after"));
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);

    // C2: o balde e por identidade, entao o agente tem orcamento proprio.
    const agentPoll = await request(queueUrl, {
      headers: { authorization: `Bearer ${agentBearer}` },
    });
    expect(agentPoll.status, await agentPoll.clone().text()).toBe(200);

    // B2: reivindicar tira a tarefa da fila.
    await resetQueueBudget();
    const claimed = await jsonRequest(
      `/v1/workspaces/${firstWorkspace}/tasks/${userTask.id}/claim`,
      firstCookie,
      "POST",
      { leaseSeconds: 600 },
      { "if-match": '"1"', "idempotency-key": `queue-claim-${RUN_ID}` },
    );
    expect(claimed.status, await claimed.clone().text()).toBe(200);
    const afterClaim = await request(queueUrl, { headers: { cookie: firstCookie } });
    expect(afterClaim.status).toBe(200);
    expect(
      ((await afterClaim.json()) as { data: Array<{ id: string }> }).data.map((task) => task.id),
    ).not.toContain(userTask.id);

    // B3: o motivo de a fila ser consulta de estado, e nao janela de tempo. Uma
    // transacao aberta durante o poll e comitada depois precisa aparecer no poll
    // seguinte. Com marco temporal essa linha se perderia para sempre.
    await resetQueueBudget();
    const lateClient = await pools.app.connect();
    try {
      await lateClient.query("BEGIN");
      await lateClient.query("SELECT private.set_request_context($1::uuid, 'user', $2::uuid)", [
        firstWorkspace,
        firstUserId,
      ]);
      const lateInsert = await lateClient.query<{ task_id: string }>(
        `INSERT INTO domain.tasks (tenant_id, project_id, title, priority)
         VALUES ($1::uuid, $2::uuid, 'Committed after the poll', 'medium')
         RETURNING task_id`,
        [firstWorkspace, projectId],
      );
      const lateTaskId = lateInsert.rows[0]?.task_id ?? "";
      expect(lateTaskId).not.toBe("");

      const duringTransaction = await request(queueUrl, { headers: { cookie: firstCookie } });
      expect(duringTransaction.status).toBe(200);
      expect(
        ((await duringTransaction.json()) as { data: Array<{ id: string }> }).data.map(
          (task) => task.id,
        ),
      ).not.toContain(lateTaskId);

      await lateClient.query("COMMIT");

      await resetQueueBudget();
      const afterCommit = await request(queueUrl, { headers: { cookie: firstCookie } });
      expect(afterCommit.status).toBe(200);
      expect(
        ((await afterCommit.json()) as { data: Array<{ id: string }> }).data.map((task) => task.id),
      ).toContain(lateTaskId);
    } finally {
      lateClient.release();
    }
  });

  it("exports personal and tenant data, then deletes only the requesting identity", async () => {
    const accountExport = await request("/v1/account/export", {
      headers: { cookie: firstCookie },
    });
    expect(accountExport.status, await accountExport.clone().text()).toBe(200);
    const accountPayload = (await accountExport.json()) as {
      account: { id: string; email: string };
      memberships: Array<{ workspaceId: string }>;
      sessions: unknown[];
    };
    expect(accountPayload.account.email).toBe(FIRST_EMAIL);
    expect(accountPayload.memberships).toContainEqual(
      expect.objectContaining({ workspaceId: firstWorkspace }),
    );
    expect(accountPayload.sessions.length).toBeGreaterThan(0);
    expect(JSON.stringify(accountPayload)).not.toContain(firstCookie.split("=", 2)[1]);

    const workspaceExport = await request(`/v1/workspaces/${firstWorkspace}/export`, {
      headers: { cookie: firstCookie },
    });
    expect(workspaceExport.status, await workspaceExport.clone().text()).toBe(200);
    expect((await workspaceExport.json()) as object).toHaveProperty("workspace.id", firstWorkspace);
    const crossTenantExport = await request(`/v1/workspaces/${firstWorkspace}/export`, {
      headers: { cookie: secondCookie },
    });
    expect(crossTenantExport.status).toBe(404);

    const soleOwner = await jsonRequest("/v1/account/delete", firstCookie, "POST", {
      confirmation: "excluir",
      email: FIRST_EMAIL,
    });
    expect(soleOwner.status).toBe(409);
    expect((await soleOwner.json()) as object).toHaveProperty("code", "sole_owner_workspace");

    const secondSession = await request("/api/auth/get-session", {
      headers: { cookie: secondCookie },
    });
    const secondUserId = ((await secondSession.json()) as { user: { id: string } }).user.id;
    const membershipClient = await pools.app.connect();
    try {
      await membershipClient.query("BEGIN");
      await membershipClient.query(
        "SELECT private.set_request_context($1::uuid, 'user', $2::uuid)",
        [firstWorkspace, accountPayload.account.id],
      );
      await membershipClient.query(
        `INSERT INTO domain.workspace_memberships
           (tenant_id, subject_type, subject_id, role)
         VALUES ($1::uuid, 'user', $2::uuid, 'owner')`,
        [firstWorkspace, secondUserId],
      );
      await membershipClient.query("COMMIT");
    } catch (error) {
      await membershipClient.query("ROLLBACK");
      throw error;
    } finally {
      membershipClient.release();
    }

    const deleted = await jsonRequest("/v1/account/delete", firstCookie, "POST", {
      confirmation: "excluir",
      email: FIRST_EMAIL,
    });
    expect(deleted.status, await deleted.clone().text()).toBe(200);
    expect((await deleted.json()) as object).toEqual(
      expect.objectContaining({ receiptId: expect.any(String), membershipsRemoved: 1 }),
    );

    const removedIdentity = await pools.auth.query(
      `SELECT
         EXISTS (SELECT 1 FROM auth."user" WHERE id = $1::uuid) AS better_auth_exists,
         EXISTS (SELECT 1 FROM auth.users WHERE user_id = $1::uuid AND deleted_at IS NULL)
           AS legacy_active`,
      [accountPayload.account.id],
    );
    expect(removedIdentity.rows[0]).toEqual({ better_auth_exists: false, legacy_active: false });

    // A4: autoria e um identificador pessoal, entao precisa ser anonimizada junto com
    // os demais rastros, e os baldes do usuario precisam sumir. Sem isso a autoria
    // sobreviveria a exclusao da conta por omissao.
    const residueClient = await pools.app.connect();
    let privacyResidue:
      | {
          authored_rows: string;
          anonymized_rows: string;
          buckets: string;
        }
      | undefined;
    try {
      await residueClient.query("BEGIN");
      // backlog_app e NOBYPASSRLS: sem contexto de tenant a consulta devolve zero para
      // tudo e o assert passaria vazio. O segundo usuario e o dono remanescente.
      await residueClient.query("SELECT private.set_request_context($1::uuid, 'user', $2::uuid)", [
        firstWorkspace,
        secondUserId,
      ]);
      const residue = await residueClient.query<{
        authored_rows: string;
        anonymized_rows: string;
        buckets: string;
      }>(
        `SELECT
           (SELECT count(*) FROM domain.tasks
             WHERE created_by_subject_type = 'user' AND created_by_subject_id = $1::uuid)
             AS authored_rows,
           (SELECT count(*) FROM domain.tasks
             WHERE created_by_subject_type = 'user'
               AND created_by_subject_id = '00000000-0000-0000-0000-000000000000'::uuid)
             AS anonymized_rows,
           (SELECT count(*) FROM domain.rate_limits
             WHERE subject_type = 'user' AND subject_id = $1::uuid)
             AS buckets`,
        [accountPayload.account.id],
      );
      privacyResidue = residue.rows[0];
      await residueClient.query("COMMIT");
    } catch (error) {
      await residueClient.query("ROLLBACK");
      throw error;
    } finally {
      residueClient.release();
    }
    expect(Number(privacyResidue?.authored_rows)).toBe(0);
    expect(Number(privacyResidue?.anonymized_rows)).toBeGreaterThan(0);
    expect(Number(privacyResidue?.buckets)).toBe(0);
    const retainedWorkspace = await request(`/v1/workspaces/${firstWorkspace}/export`, {
      headers: { cookie: secondCookie },
    });
    expect(retainedWorkspace.status, await retainedWorkspace.clone().text()).toBe(200);
    const revokedSession = await request("/v1/account/export", {
      headers: { cookie: firstCookie },
    });
    expect(revokedSession.status).toBe(401);
  });
});
