import { ProblemDetailSchema } from "@backlog-syntax/contracts";
import { describe, expect, it } from "vitest";
import { createFoundationApp } from "../src/app.js";
import { parseConfig } from "../src/config.js";
import { FOUNDATION_FIXTURE } from "../src/infrastructure/mock-workspace-context.js";

const config = {
  ALLOW_TEST_PRINCIPAL: true,
  PUBLIC_API_URL: "https://api.example.test",
  WEB_ORIGIN: "https://app.example.test",
};

describe("foundation HTTP surface", () => {
  it("accepts standard process environment keys while validating app config", () => {
    const parsed = parseConfig({
      PATH: "system-path",
      AUTH_DATABASE_URL: "postgresql://auth:test@localhost:5432/backlog",
      APP_DATABASE_URL: "postgresql://app:test@localhost:5432/backlog",
      AUTH_SECRET: "test-secret-at-least-thirty-two-characters",
    });
    expect(parsed.API_PORT).toBe(8787);
    expect(parsed.ALLOW_TEST_PRINCIPAL).toBe(false);
  });

  it("fails fast when a test principal is enabled in production", () => {
    expect(() =>
      parseConfig({
        NODE_ENV: "production",
        ALLOW_TEST_PRINCIPAL: "true",
        AUTH_DATABASE_URL: "postgresql://auth:test@localhost:5432/backlog",
        APP_DATABASE_URL: "postgresql://app:test@localhost:5432/backlog",
        AUTH_SECRET: "test-secret-at-least-thirty-two-characters",
      }),
    ).toThrow("ALLOW_TEST_PRINCIPAL must be false in production");
  });

  it("requires HTTPS origins and a host-only cookie in production", () => {
    expect(() =>
      parseConfig({
        NODE_ENV: "production",
        WEB_ORIGIN: "http://localhost:3000",
        PUBLIC_API_URL: "http://localhost:8787",
        SESSION_COOKIE_NAME: "backlog_session",
        AUTH_DATABASE_URL: "postgresql://auth:test@localhost:5432/backlog",
        APP_DATABASE_URL: "postgresql://app:test@localhost:5432/backlog",
        AUTH_SECRET: "test-secret-at-least-thirty-two-characters",
      }),
    ).toThrow("Production origins must use HTTPS");
  });

  it("keeps liveness independent from database readiness", async () => {
    const app = createFoundationApp({ config, readinessCheck: async () => false });
    expect((await app.request("/health")).status).toBe(200);
    expect((await app.request("/ready")).status).toBe(503);
  });

  it("requires an explicit test principal", async () => {
    const app = createFoundationApp({ config });
    const response = await app.request(`/v1/workspaces/${FOUNDATION_FIXTURE.workspaceId}/context`);
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/problem+json");
  });

  it("does not reveal another workspace", async () => {
    const app = createFoundationApp({ config });
    const response = await app.request(
      "/v1/workspaces/019641a8-8c54-7f6c-8d2f-3fd1eb8b7599/context",
      { headers: { "x-test-subject-id": FOUNDATION_FIXTURE.userId } },
    );
    expect(response.status).toBe(404);
  });

  it("rejects a cross-origin MCP mutation", async () => {
    const app = createFoundationApp({ config });
    const response = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.example",
        "x-test-subject-id": FOUNDATION_FIXTURE.userId,
      },
      body: "{}",
    });
    expect(response.status).toBe(403);
  });

  it("rejects an unexpected MCP host", async () => {
    const app = createFoundationApp({ config });
    const response = await app.request("https://attacker.example/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: config.WEB_ORIGIN,
        "x-test-subject-id": FOUNDATION_FIXTURE.userId,
      },
      body: "{}",
    });
    expect(response.status).toBe(403);
  });

  it.each([
    ["ASCII", "a".repeat(50_000)],
    ["accented", "ação".repeat(12_500)],
    ["CJK", "界".repeat(50_000)],
    ["escaped controls", "\u0000".repeat(50_000)],
  ])("accepts a valid-sized %s JSON payload", async (_profile, description) => {
    const app = createFoundationApp({ config });
    const response = await app.request("/missing", {
      method: "POST",
      headers: { "content-type": "application/json", origin: config.WEB_ORIGIN },
      body: JSON.stringify({ description }),
    });

    expect(response.status).toBe(404);
  });

  it("rejects a payload above 512 KiB with a traceable RFC 9457 response", async () => {
    const app = createFoundationApp({ config });
    const response = await app.request("/missing", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        origin: config.WEB_ORIGIN,
        "x-request-id": "payload-limit-test",
      },
      body: "x".repeat(512 * 1024 + 1),
    });
    const problem = ProblemDetailSchema.parse(await response.json());

    expect(response.status).toBe(413);
    expect(response.headers.get("content-type")).toContain("application/problem+json");
    expect(response.headers.get("x-request-id")).toBe("payload-limit-test");
    expect(problem).toMatchObject({
      status: 413,
      traceId: "payload-limit-test",
      code: "payload_too_large",
    });
  });

  it("publishes OpenAPI 3.1", async () => {
    const app = createFoundationApp({ config });
    const response = await app.request("/openapi.json");
    const document = await response.json();
    expect(response.status).toBe(200);
    expect(document.openapi).toBe("3.1.0");
    expect(document.paths).toHaveProperty(`/v1/workspaces/{workspaceId}/context`);
    expect(document.components.securitySchemes).toMatchObject({
      sessionCookie: { type: "apiKey", in: "cookie" },
      bearerAuth: { type: "http", scheme: "bearer" },
    });
    const workspaceContext = document.paths["/v1/workspaces/{workspaceId}/context"].get;
    expect(workspaceContext.security).toEqual([{ sessionCookie: [] }, { bearerAuth: [] }]);
    expect(workspaceContext.responses).toHaveProperty("401");
    expect(workspaceContext.responses).toHaveProperty("404");
    expect(document.security).toBeUndefined();
  });

  it("renders the interactive reference with the branded modern layout", async () => {
    const app = createFoundationApp({ config });
    const response = await app.request("/docs");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('"layout": "modern"');
    expect(html).toContain('"theme": "none"');
    expect(html).toContain("--scalar-sidebar-item-active-background: #dfff4f");
    expect(html).toContain("--backlog-docs-header-height: 4rem");
  });
});
