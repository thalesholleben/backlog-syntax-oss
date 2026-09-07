import { randomUUID } from "node:crypto";
import {
  ProblemDetailSchema,
  WorkspaceContextParamsSchema,
  WorkspaceContextSchema,
} from "@backlog-syntax/contracts";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { type AuthInfo, hostHeaderValidationResponse } from "@modelcontextprotocol/server";
import { apiReference } from "@scalar/hono-api-reference";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { PrincipalResolver } from "../auth/principal-resolver.js";
import type { ApiConfig } from "../config.js";
import { DomainError } from "../domain/errors.js";
import type { Principal } from "../domain/principal.js";
import type { GetWorkspaceContextUseCase } from "../domain/workspace-context.js";
import type { PostgresProductRepository } from "../infrastructure/postgres-product-repository.js";
import { createWorkspaceContextMcpHandler } from "../mcp/server.js";
import type { AccountPrivacyService } from "../privacy/account-privacy-service.js";
import { presentProblem } from "./problem-presenter.js";
import { registerProductDocumentation, registerProductRoutes } from "./product-routes.js";

interface AppDependencies {
  config: Pick<ApiConfig, "PUBLIC_API_URL" | "WEB_ORIGIN">;
  getWorkspaceContext: GetWorkspaceContextUseCase;
  principalResolver: PrincipalResolver;
  readinessCheck: () => Promise<boolean>;
  authHandler?: (request: Request) => Promise<Response>;
  protectedMcpHandler?: (request: Request) => Promise<Response>;
  repository?: PostgresProductRepository;
  accountPrivacyService?: AccountPrivacyService;
}

export interface AppVariables {
  traceId: string;
}

const problemResponse = {
  content: { "application/problem+json": { schema: ProblemDetailSchema } },
  description: "RFC 9457 Problem Details",
} as const;

const apiReferenceCustomCss = `
:root {
  --backlog-docs-header-height: 4rem;
}

body {
  margin: 0;
  background: #e9eae6;
}

body::before {
  position: fixed;
  z-index: 50;
  inset: 0 0 auto;
  height: var(--backlog-docs-header-height);
  border-bottom: 1px solid #d2d4cd;
  background: #e9eae6;
  content: "";
}

body::after {
  position: fixed;
  z-index: 51;
  top: 0;
  left: 1.5rem;
  display: flex;
  align-items: center;
  height: var(--backlog-docs-header-height);
  color: #121212;
  content: "backlog";
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.875rem;
  font-weight: 750;
  letter-spacing: -0.02em;
}

#app::before,
#app::after {
  position: fixed;
  z-index: 51;
  top: 0;
  display: flex;
  align-items: center;
  height: var(--backlog-docs-header-height);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.875rem;
  font-weight: 750;
}

#app::before {
  left: 4.6rem;
  color: #95ad1c;
  content: ".";
}

#app::after {
  left: 6.25rem;
  padding-left: 1rem;
  border-left: 1px solid #d2d4cd;
  color: #121212;
  content: "API Reference";
}

.scalar-api-reference {
  --scalar-color-1: #121212;
  --scalar-color-2: #6e7069;
  --scalar-color-3: #757770;
  --scalar-color-disabled: #9b9d95;
  --scalar-color-ghost: rgb(18 18 18 / 16%);
  --scalar-color-accent: #596900;
  --scalar-background-1: #ffffff;
  --scalar-background-2: #f2f3ef;
  --scalar-background-3: #e9eae6;
  --scalar-background-4: rgb(18 18 18 / 6%);
  --scalar-background-accent: rgb(223 255 79 / 32%);
  --scalar-border-color: #e3e4df;
  --scalar-scrollbar-color: #d2d4cd;
  --scalar-scrollbar-color-active: #9b9d95;
  --scalar-shadow-1: 0 1px 2px rgb(18 18 18 / 4%);
  --scalar-shadow-2: 0 18px 38px -24px rgb(18 18 18 / 28%);
  --scalar-button-1: #121212;
  --scalar-button-1-color: #f3f3f0;
  --scalar-button-1-hover: #000000;
  --scalar-color-green: #059669;
  --scalar-color-red: #b3261e;
  --scalar-color-yellow: #a66500;
  --scalar-color-blue: #2563eb;
  --scalar-color-orange: #c25a22;
  --scalar-color-purple: #7c3aed;
  --scalar-sidebar-background-1: #e9eae6;
  --scalar-sidebar-item-hover-color: #121212;
  --scalar-sidebar-item-hover-background: #f2f3ef;
  --scalar-sidebar-item-active-background: #dfff4f;
  --scalar-sidebar-border-color: transparent;
  --scalar-sidebar-color-1: #121212;
  --scalar-sidebar-color-2: #6e7069;
  --scalar-sidebar-color-active: #121212;
  --scalar-sidebar-search-background: #ffffff;
  --scalar-sidebar-search-border-color: #d2d4cd;
  --scalar-sidebar-search-color: #6e7069;
  --scalar-sidebar-width: 17rem;
  box-sizing: border-box;
  min-height: 100vh;
  padding-top: var(--backlog-docs-header-height);
  background: #e9eae6;
}

.scalar-api-reference .t-doc__sidebar {
  top: var(--backlog-docs-header-height);
  height: calc(100vh - var(--backlog-docs-header-height));
  border-right: 0;
}

.scalar-api-reference .references-rendered {
  width: calc(100% - 1rem);
  min-width: 0;
  margin: 1rem 1rem 1rem 0;
  overflow: clip;
  border: 1px solid #d2d4cd;
  border-radius: 1.5rem;
  background: #ffffff;
  box-shadow: 0 1px 2px rgb(18 18 18 / 4%), 0 18px 38px -24px rgb(18 18 18 / 22%);
}

.scalar-api-reference .api-reference-toolbar {
  display: none;
}

.scalar-api-reference :focus-visible {
  outline-color: #95ad1c;
}

body.dark-mode {
  background: #0a0a0a;
}

body.dark-mode::before {
  border-color: #292929;
  background: #0a0a0a;
}

body.dark-mode::after {
  color: #f3f3f0;
}

body.dark-mode #app::before {
  color: #dfff4f;
}

body.dark-mode #app::after {
  border-color: #292929;
  color: #f3f3f0;
}

body.dark-mode .scalar-api-reference {
  --scalar-color-1: #f3f3f0;
  --scalar-color-2: #a0a29a;
  --scalar-color-3: #8a8c84;
  --scalar-color-disabled: #676962;
  --scalar-color-ghost: rgb(255 255 255 / 14%);
  --scalar-color-accent: #dfff4f;
  --scalar-background-1: #171717;
  --scalar-background-2: #212121;
  --scalar-background-3: #0a0a0a;
  --scalar-background-4: rgb(255 255 255 / 7%);
  --scalar-background-accent: rgb(223 255 79 / 12%);
  --scalar-border-color: #292929;
  --scalar-scrollbar-color: #3c3c3c;
  --scalar-scrollbar-color-active: #676962;
  --scalar-button-1: #dfff4f;
  --scalar-button-1-color: #121212;
  --scalar-button-1-hover: #edff92;
  --scalar-color-green: #5ddcaf;
  --scalar-color-red: #ff6b5e;
  --scalar-color-yellow: #f0b44e;
  --scalar-color-blue: #84affc;
  --scalar-color-orange: #ef986f;
  --scalar-color-purple: #bca5fb;
  --scalar-sidebar-background-1: #0a0a0a;
  --scalar-sidebar-item-hover-color: #f3f3f0;
  --scalar-sidebar-item-hover-background: #212121;
  --scalar-sidebar-item-active-background: #dfff4f;
  --scalar-sidebar-color-1: #f3f3f0;
  --scalar-sidebar-color-2: #a0a29a;
  --scalar-sidebar-color-active: #121212;
  --scalar-sidebar-search-background: #171717;
  --scalar-sidebar-search-border-color: #3c3c3c;
  --scalar-sidebar-search-color: #a0a29a;
  background: #0a0a0a;
}

body.dark-mode .scalar-api-reference .references-rendered {
  border-color: #292929;
  background: #171717;
  box-shadow: 0 18px 38px -24px rgb(0 0 0 / 85%);
}

@media (max-width: 1023px) {
  :root {
    --backlog-docs-header-height: 3.5rem;
  }

  body::after {
    left: 1rem;
    font-size: 0.8125rem;
  }

  #app::before {
    left: 4rem;
    font-size: 0.8125rem;
  }

  #app::after {
    left: 5.5rem;
    font-size: 0.8125rem;
  }

  .scalar-api-reference .references-rendered {
    width: calc(100% - 1rem);
    margin: 0.5rem;
    border-radius: 1rem;
  }
}
`;

const workspaceContextRoute = createRoute({
  method: "get",
  path: "/v1/workspaces/{workspaceId}/context",
  operationId: "getWorkspaceContext",
  summary: "Get workspace context",
  description:
    "Returns the authenticated principal and trusted context for one accessible workspace.",
  request: { params: WorkspaceContextParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: WorkspaceContextSchema } },
      description: "Trusted workspace and principal context",
    },
    401: problemResponse,
    404: problemResponse,
    500: problemResponse,
  },
  tags: ["Workspace context"],
  security: [{ sessionCookie: [] }, { bearerAuth: [] }],
});

export function createOpenApiDocumentConfig(publicApiUrl: string) {
  return {
    openapi: "3.1.0" as const,
    info: {
      title: "Backlog Syntax API",
      version: "0.1.0",
      description: "Contract-first REST API for a secure, multi-tenant, agent-native backlog.",
    },
    servers: [{ url: publicApiUrl }],
  };
}

function testAuthInfo(principal: Principal, resource: string): AuthInfo {
  return {
    token: "test-principal-redacted",
    clientId: principal.subjectId,
    scopes: [...principal.scopes],
    resource: new URL(`${resource}/mcp`),
    extra: { principal },
  };
}

export function createApiApp(dependencies: AppDependencies) {
  const app = new OpenAPIHono<{ Variables: AppVariables }>({
    defaultHook(result, context) {
      if (result.success) return;
      const traceId = context.get("traceId") ?? randomUUID();
      const problem = {
        ...presentProblem(
          new DomainError("invalid_request", 422, "Request validation failed"),
          context.req.path,
          traceId,
        ),
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join(".") || "request",
          message: issue.message,
        })),
      };
      return context.json(problem, 422, { "Content-Type": "application/problem+json" });
    },
  });

  app.use("*", async (context, next) => {
    const traceId = context.req.header("x-request-id")?.slice(0, 128) || randomUUID();
    context.set("traceId", traceId);
    context.header("x-request-id", traceId);
    await next();
  });
  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: dependencies.config.WEB_ORIGIN,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "If-Match", "Idempotency-Key"],
      exposeHeaders: ["ETag", "Location", "x-request-id"],
    }),
  );
  app.use("*", async (context, next) => {
    const origin = context.req.header("origin");
    const isMutation = !["GET", "HEAD", "OPTIONS"].includes(context.req.method);
    const usesBrowserCredentials = Boolean(context.req.header("cookie"));
    if (
      isMutation &&
      (origin ? origin !== dependencies.config.WEB_ORIGIN : usesBrowserCredentials)
    ) {
      const problem = presentProblem(
        new DomainError("forbidden", 403, "Origin is not allowed"),
        context.req.path,
        context.get("traceId"),
      );
      return context.json(problem, 403, { "Content-Type": "application/problem+json" });
    }
    await next();
  });
  app.use(
    "*",
    bodyLimit({
      maxSize: 512 * 1024,
      onError(context) {
        const problem = presentProblem(
          new DomainError("payload_too_large", 413, "Payload is too large"),
          context.req.path,
          context.get("traceId"),
        );
        return context.json(problem, 413, { "Content-Type": "application/problem+json" });
      },
    }),
  );

  app.get("/health", (context) => context.json({ status: "ok" }));
  app.get("/ready", async (context) => {
    const isReady = await dependencies.readinessCheck();
    if (isReady) return context.json({ status: "ready" });
    const problem = presentProblem(
      new DomainError("dependency_unavailable", 503, "Database is not ready"),
      context.req.path,
      context.get("traceId"),
    );
    return context.json(problem, 503, { "Content-Type": "application/problem+json" });
  });

  if (dependencies.authHandler) {
    const authHandler = dependencies.authHandler;
    app.all("/api/auth/*", (context) => authHandler(context.req.raw));
    app.get("/.well-known/*", (context) => authHandler(context.req.raw));
  }

  app.openapi(workspaceContextRoute, async (context) => {
    const principal = await dependencies.principalResolver(context);
    if (!principal) {
      const problem = presentProblem(
        new DomainError("unauthenticated", 401, "Authentication is required"),
        context.req.path,
        context.get("traceId"),
      );
      return context.json(problem, 401, { "Content-Type": "application/problem+json" });
    }

    const { workspaceId } = context.req.valid("param");
    try {
      const result = await dependencies.getWorkspaceContext.execute({ workspaceId, principal });
      return context.json(result, 200);
    } catch (error) {
      const problem = presentProblem(error, context.req.path, context.get("traceId"));
      const status = problem.status === 404 ? 404 : 500;
      return context.json(problem, status, { "Content-Type": "application/problem+json" });
    }
  });

  if (dependencies.repository && dependencies.accountPrivacyService) {
    registerProductRoutes(app, {
      principalResolver: dependencies.principalResolver,
      repository: dependencies.repository,
      accountPrivacyService: dependencies.accountPrivacyService,
    });
  } else {
    registerProductDocumentation(app);
  }

  app.openAPIRegistry.registerComponent("securitySchemes", "sessionCookie", {
    type: "apiKey",
    in: "cookie",
    name: "__Host-backlog_session",
    description: "Better Auth browser session cookie. The configured name may differ locally.",
  });
  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "PAT or OAuth 2.1 access token",
  });
  app.doc("/openapi.json", createOpenApiDocumentConfig(dependencies.config.PUBLIC_API_URL));
  app.get(
    "/docs",
    apiReference({
      pageTitle: "Backlog Syntax API",
      spec: { url: "/openapi.json" },
      theme: "none",
      layout: "modern",
      showSidebar: true,
      showDeveloperTools: "never",
      customCss: apiReferenceCustomCss,
    }),
  );

  const mcpHandler = createWorkspaceContextMcpHandler(dependencies.getWorkspaceContext);
  app.all("/mcp", async (context) => {
    const invalidHost = hostHeaderValidationResponse(context.req.raw, [
      new URL(dependencies.config.PUBLIC_API_URL).hostname,
      "localhost",
      "127.0.0.1",
    ]);
    if (invalidHost) return invalidHost;

    if (dependencies.protectedMcpHandler) {
      return dependencies.protectedMcpHandler(context.req.raw);
    }

    const principal = await dependencies.principalResolver(context);
    if (!principal) {
      const problem = presentProblem(
        new DomainError("unauthenticated", 401, "Authentication is required"),
        context.req.path,
        context.get("traceId"),
      );
      return context.json(problem, 401, { "Content-Type": "application/problem+json" });
    }

    return mcpHandler.fetch(context.req.raw, {
      authInfo: testAuthInfo(principal, dependencies.config.PUBLIC_API_URL),
    });
  });

  app.notFound((context) => {
    const problem = presentProblem(
      new DomainError("not_found", 404, "Route not found"),
      context.req.path,
      context.get("traceId"),
    );
    return context.json(problem, 404, { "Content-Type": "application/problem+json" });
  });
  app.onError((error, context) => {
    const problem = presentProblem(error, context.req.path, context.get("traceId"));
    return new Response(JSON.stringify(problem), {
      status: problem.status,
      headers: { "Content-Type": "application/problem+json" },
    });
  });

  return app;
}
