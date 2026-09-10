import {
  ApiTokenListSchema,
  AccountDeletionReceiptSchema,
  AccountExportSchema,
  ClaimTaskInputSchema,
  CreateApiTokenInputSchema,
  CreatedApiTokenSchema,
  CreateProjectInputSchema,
  CreateServiceAccountInputSchema,
  CreateTaskInputSchema,
  CreateWorkspaceInputSchema,
  CursorQuerySchema,
  DeleteAccountInputSchema,
  ExtendClaimInputSchema,
  ExportSchema,
  HandoffTaskInputSchema,
  IdentifierSchema,
  ProjectListQuerySchema,
  ProjectListSchema,
  ProjectSchema,
  ProblemDetailSchema,
  RecordTaskEventInputSchema,
  ServiceAccountListSchema,
  ServiceAccountSchema,
  TaskClaimSchema,
  TaskEventSchema,
  TaskEventListSchema,
  TaskListSchema,
  TaskQueueSchema,
  TaskSchema,
  TaskStatusSchema,
  UpdateProjectInputSchema,
  UpdateTaskInputSchema,
  UpdateWorkspaceInputSchema,
  WorkspaceListSchema,
  WorkspaceSchema,
} from "@backlog-syntax/contracts";
import { z, type OpenAPIHono } from "@hono/zod-openapi";
import type { PrincipalResolver } from "../auth/principal-resolver.js";
import { DomainError } from "../domain/errors.js";
import type { Principal } from "../domain/principal.js";
import type { PostgresProductRepository } from "../infrastructure/postgres-product-repository.js";
import type { AccountPrivacyService } from "../privacy/account-privacy-service.js";
import type { AppVariables } from "./app.js";
import { presentProblem } from "./problem-presenter.js";

interface Dependencies {
  principalResolver: PrincipalResolver;
  repository: PostgresProductRepository;
  accountPrivacyService: AccountPrivacyService;
}

const WorkspaceParams = z.object({ workspaceId: IdentifierSchema });
const ProjectParams = WorkspaceParams.extend({ projectId: IdentifierSchema });
const TaskParams = WorkspaceParams.extend({ taskId: IdentifierSchema });
const TokenParams = WorkspaceParams.extend({ tokenId: IdentifierSchema });
const ServiceAccountParams = WorkspaceParams.extend({ serviceAccountId: IdentifierSchema });
const IdempotencyHeaders = z.object({ "Idempotency-Key": z.string().min(8).max(200) });
const VersionHeaders = IdempotencyHeaders.extend({ "If-Match": z.string().min(1).max(32) });
const TASK_QUEUE_BUCKET = "task-queue";
const TASK_QUEUE_WINDOW_SECONDS = 60;

const RestTaskQueueQuery = z.object({
  projectId: IdentifierSchema,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const RestTaskListQuery = CursorQuerySchema.extend({
  projectId: IdentifierSchema.optional(),
  status: TaskStatusSchema.optional(),
});
const RestCreateTask = CreateTaskInputSchema.omit({ workspaceId: true });
const RestUpdateTask = UpdateTaskInputSchema.shape.patch;
const RestClaim = ClaimTaskInputSchema.omit({
  workspaceId: true,
  taskId: true,
  expectedVersion: true,
});
const RestExtend = ExtendClaimInputSchema.omit({
  workspaceId: true,
  taskId: true,
  expectedVersion: true,
});
const RestHandoff = HandoffTaskInputSchema.omit({
  workspaceId: true,
  taskId: true,
  expectedVersion: true,
});
const RestEvent = RecordTaskEventInputSchema.omit({
  workspaceId: true,
  taskId: true,
  expectedVersion: true,
});

function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new DomainError(
      "invalid_request",
      422,
      result.error.issues[0]?.message ?? "Invalid request",
    );
  return result.data;
}

function parseVersion(value: string | undefined): number {
  const match = /^(?:W\/)?"?(\d+)"?$/.exec(value ?? "");
  const version = match ? Number(match[1]) : Number.NaN;
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new DomainError("invalid_request", 422, "If-Match must contain a positive task version");
  }
  return version;
}

function idempotencyKey(headers: Headers): string {
  return parse(IdempotencyHeaders, { "Idempotency-Key": headers.get("idempotency-key") })[
    "Idempotency-Key"
  ];
}

async function principalFor(
  resolver: PrincipalResolver,
  context: Parameters<PrincipalResolver>[0],
  scope: "read" | "write" = "read",
): Promise<Principal> {
  const principal = await resolver(context);
  if (!principal) throw new DomainError("unauthenticated", 401, "Authentication is required");
  if (!principal.scopes.includes(scope) && !principal.scopes.includes("admin")) {
    throw new DomainError("forbidden", 403, `${scope} scope is required`);
  }
  return principal;
}

const response = (schema: z.ZodType, description: string) => ({
  content: { "application/json": { schema } },
  description,
});

const problem = {
  content: { "application/problem+json": { schema: ProblemDetailSchema } },
  description: "RFC 9457 Problem Details",
};

function registerDocumentation(app: OpenAPIHono<{ Variables: AppVariables }>): void {
  const paths: Array<Parameters<typeof app.openAPIRegistry.registerPath>[0]> = [
    {
      method: "get",
      path: "/v1/account/export",
      operationId: "exportAccount",
      summary: "Export account data",
      description: "Returns a portable export of the authenticated account and its owned data.",
      responses: { 200: response(AccountExportSchema, "Authenticated account export") },
    },
    {
      method: "post",
      path: "/v1/account/delete",
      operationId: "deleteAccount",
      summary: "Delete the authenticated account",
      description:
        "Deletes the authenticated account after the submitted email confirms the request.",
      request: {
        body: { content: { "application/json": { schema: DeleteAccountInputSchema } } },
      },
      responses: { 200: response(AccountDeletionReceiptSchema, "Account deletion receipt") },
    },
    {
      method: "get",
      path: "/v1/workspaces",
      operationId: "listWorkspaces",
      summary: "List accessible workspaces",
      description: "Returns a cursor-paginated list of workspaces accessible to the principal.",
      request: { query: CursorQuerySchema },
      responses: { 200: response(WorkspaceListSchema, "Workspaces") },
    },
    {
      method: "get",
      path: "/v1/workspaces/{workspaceId}/tasks/{taskId}/events",
      operationId: "listTaskEvents",
      summary: "List task events",
      description: "Returns the audit event history for one task in an accessible workspace.",
      request: { params: TaskParams },
      responses: { 200: response(TaskEventListSchema, "Task events") },
    },
    {
      method: "post",
      path: "/v1/workspaces",
      operationId: "createWorkspace",
      summary: "Create a workspace",
      description: "Creates a workspace owned by the authenticated principal.",
      request: {
        body: { content: { "application/json": { schema: CreateWorkspaceInputSchema } } },
      },
      responses: { 201: response(WorkspaceSchema, "Workspace created") },
    },
    {
      method: "get",
      path: "/v1/workspaces/{workspaceId}/export",
      operationId: "exportWorkspace",
      summary: "Export a workspace",
      description: "Returns a portable export of one accessible workspace and its domain data.",
      request: { params: WorkspaceParams },
      responses: { 200: response(ExportSchema, "Workspace export") },
    },
    {
      method: "patch",
      path: "/v1/workspaces/{workspaceId}",
      operationId: "updateWorkspace",
      summary: "Update a workspace",
      description: "Updates mutable settings for one accessible workspace.",
      request: {
        params: WorkspaceParams,
        body: { content: { "application/json": { schema: UpdateWorkspaceInputSchema } } },
      },
      responses: { 200: response(WorkspaceSchema, "Workspace updated") },
    },
    {
      method: "delete",
      path: "/v1/workspaces/{workspaceId}",
      operationId: "deleteWorkspace",
      summary: "Delete a workspace",
      description: "Permanently deletes one accessible workspace and its domain data.",
      request: { params: WorkspaceParams },
      responses: { 204: { description: "Workspace deleted" } },
    },
    {
      method: "get",
      path: "/v1/workspaces/{workspaceId}/projects",
      operationId: "listProjects",
      summary: "List workspace projects",
      description: "Returns a filtered, cursor-paginated list of projects in one workspace.",
      request: { params: WorkspaceParams, query: ProjectListQuerySchema },
      responses: { 200: response(ProjectListSchema, "Projects") },
    },
    {
      method: "post",
      path: "/v1/workspaces/{workspaceId}/projects",
      operationId: "createProject",
      summary: "Create a project",
      description: "Creates an idempotent project in one accessible workspace.",
      request: {
        params: WorkspaceParams,
        headers: IdempotencyHeaders,
        body: { content: { "application/json": { schema: CreateProjectInputSchema } } },
      },
      responses: { 201: response(ProjectSchema, "Project created") },
    },
    {
      method: "get",
      path: "/v1/workspaces/{workspaceId}/projects/{projectId}",
      operationId: "getProject",
      summary: "Get a project",
      description: "Returns one project when it belongs to the requested accessible workspace.",
      request: { params: ProjectParams },
      responses: { 200: response(ProjectSchema, "Project") },
    },
    {
      method: "patch",
      path: "/v1/workspaces/{workspaceId}/projects/{projectId}",
      operationId: "updateProject",
      summary: "Update a project",
      description: "Updates one project through an idempotent workspace-scoped request.",
      request: {
        params: ProjectParams,
        headers: IdempotencyHeaders,
        body: { content: { "application/json": { schema: UpdateProjectInputSchema } } },
      },
      responses: { 200: response(ProjectSchema, "Project updated") },
    },
    {
      method: "delete",
      path: "/v1/workspaces/{workspaceId}/projects/{projectId}",
      operationId: "deleteProject",
      summary: "Delete a project",
      description: "Deletes one project through an idempotent workspace-scoped request.",
      request: { params: ProjectParams, headers: IdempotencyHeaders },
      responses: { 204: { description: "Project deleted" } },
    },
    {
      method: "get",
      path: "/v1/workspaces/{workspaceId}/task-queue",
      operationId: "listTaskQueue",
      summary: "List the execution queue of a project",
      description:
        "Returns open, unclaimed tasks of one project as current state, for an agent that polls for work. Rate limited to one request per minute per principal.",
      request: { params: WorkspaceParams, query: RestTaskQueueQuery },
      responses: {
        200: response(TaskQueueSchema, "Queued tasks"),
        429: { description: "Rate limit exceeded; retry after the advertised delay" },
      },
    },
    {
      method: "get",
      path: "/v1/workspaces/{workspaceId}/tasks",
      operationId: "listTasks",
      summary: "List workspace tasks",
      description: "Returns a filtered, cursor-paginated list of tasks in one workspace.",
      request: { params: WorkspaceParams, query: RestTaskListQuery },
      responses: { 200: response(TaskListSchema, "Tasks") },
    },
    {
      method: "post",
      path: "/v1/workspaces/{workspaceId}/tasks",
      operationId: "createTask",
      summary: "Create a task",
      description: "Creates an idempotent task in one accessible workspace.",
      request: {
        params: WorkspaceParams,
        headers: IdempotencyHeaders,
        body: { content: { "application/json": { schema: RestCreateTask } } },
      },
      responses: { 201: response(TaskSchema, "Task created") },
    },
    {
      method: "get",
      path: "/v1/workspaces/{workspaceId}/tasks/{taskId}",
      operationId: "getTask",
      summary: "Get a task",
      description: "Returns one task and its current version from an accessible workspace.",
      request: { params: TaskParams },
      responses: { 200: response(TaskSchema, "Task") },
    },
    {
      method: "patch",
      path: "/v1/workspaces/{workspaceId}/tasks/{taskId}",
      operationId: "updateTask",
      summary: "Update a task",
      description: "Updates one task idempotently when the If-Match version matches current state.",
      request: {
        params: TaskParams,
        headers: VersionHeaders,
        body: { content: { "application/json": { schema: RestUpdateTask } } },
      },
      responses: { 200: response(TaskSchema, "Task updated") },
    },
    {
      method: "delete",
      path: "/v1/workspaces/{workspaceId}/tasks/{taskId}",
      operationId: "deleteTask",
      summary: "Delete a task",
      description: "Deletes one task idempotently when the If-Match version matches current state.",
      request: { params: TaskParams, headers: VersionHeaders },
      responses: { 204: { description: "Task deleted" } },
    },
    {
      method: "post",
      path: "/v1/workspaces/{workspaceId}/tasks/{taskId}/claim",
      operationId: "claimTask",
      summary: "Claim a task",
      description: "Creates a time-limited task claim when the submitted version is current.",
      request: {
        params: TaskParams,
        headers: VersionHeaders,
        body: { content: { "application/json": { schema: RestClaim } } },
      },
      responses: { 200: response(TaskClaimSchema, "Task claimed") },
    },
    {
      method: "post",
      path: "/v1/workspaces/{workspaceId}/tasks/{taskId}/claim/extend",
      operationId: "extendTaskClaim",
      summary: "Extend a task claim",
      description: "Extends an active task claim when the submitted version is current.",
      request: {
        params: TaskParams,
        headers: VersionHeaders,
        body: { content: { "application/json": { schema: RestExtend } } },
      },
      responses: { 200: response(TaskClaimSchema, "Claim extended") },
    },
    {
      method: "post",
      path: "/v1/workspaces/{workspaceId}/tasks/{taskId}/claim/release",
      operationId: "releaseTaskClaim",
      summary: "Release a task claim",
      description: "Releases an active task claim when the submitted version is current.",
      request: { params: TaskParams, headers: VersionHeaders },
      responses: { 204: { description: "Claim released" } },
    },
    {
      method: "post",
      path: "/v1/workspaces/{workspaceId}/tasks/{taskId}/handoff",
      operationId: "handoffTask",
      summary: "Hand off a task",
      description: "Transfers an active task claim to another eligible principal.",
      request: {
        params: TaskParams,
        headers: VersionHeaders,
        body: { content: { "application/json": { schema: RestHandoff } } },
      },
      responses: { 200: response(TaskClaimSchema, "Task handed off") },
    },
    {
      method: "post",
      path: "/v1/workspaces/{workspaceId}/tasks/{taskId}/events",
      operationId: "recordTaskEvent",
      summary: "Record a task event",
      description: "Appends an idempotent audit event when the submitted task version is current.",
      request: {
        params: TaskParams,
        headers: VersionHeaders,
        body: { content: { "application/json": { schema: RestEvent } } },
      },
      responses: { 201: response(TaskEventSchema, "Event recorded") },
    },
    {
      method: "get",
      path: "/v1/workspaces/{workspaceId}/service-accounts",
      operationId: "listServiceAccounts",
      summary: "List service accounts",
      description: "Returns service accounts bound to one accessible workspace.",
      request: { params: WorkspaceParams },
      responses: { 200: response(ServiceAccountListSchema, "Service accounts") },
    },
    {
      method: "post",
      path: "/v1/workspaces/{workspaceId}/service-accounts",
      operationId: "createServiceAccount",
      summary: "Create a service account",
      description: "Creates a scoped technical principal bound to one accessible workspace.",
      request: {
        params: WorkspaceParams,
        body: { content: { "application/json": { schema: CreateServiceAccountInputSchema } } },
      },
      responses: { 201: response(ServiceAccountSchema, "Service account created") },
    },
    {
      method: "delete",
      path: "/v1/workspaces/{workspaceId}/service-accounts/{serviceAccountId}",
      operationId: "revokeServiceAccount",
      summary: "Revoke a service account",
      description: "Revokes one workspace service account and all tokens issued to it.",
      request: { params: ServiceAccountParams },
      responses: { 204: { description: "Service account and tokens revoked" } },
    },
    {
      method: "get",
      path: "/v1/workspaces/{workspaceId}/api-tokens",
      operationId: "listApiTokens",
      summary: "List API tokens",
      description: "Returns token metadata for service accounts in one accessible workspace.",
      request: { params: WorkspaceParams },
      responses: { 200: response(ApiTokenListSchema, "API tokens") },
    },
    {
      method: "post",
      path: "/v1/workspaces/{workspaceId}/api-tokens",
      operationId: "createApiToken",
      summary: "Create an API token",
      description: "Issues a scoped API token whose secret is returned only in this response.",
      request: {
        params: WorkspaceParams,
        body: { content: { "application/json": { schema: CreateApiTokenInputSchema } } },
      },
      responses: {
        201: response(CreatedApiTokenSchema, "API token created; secret is returned once"),
      },
    },
    {
      method: "delete",
      path: "/v1/workspaces/{workspaceId}/api-tokens/{tokenId}",
      operationId: "revokeApiToken",
      summary: "Revoke an API token",
      description: "Revokes one API token in an accessible workspace.",
      request: { params: TokenParams },
      responses: { 204: { description: "API token revoked" } },
    },
  ];
  for (const path of paths) {
    path.security = [{ sessionCookie: [] }, { bearerAuth: [] }];
    path.responses = {
      401: problem,
      403: problem,
      404: problem,
      409: problem,
      413: problem,
      422: problem,
      500: problem,
      ...path.responses,
    };
    app.openAPIRegistry.registerPath(path);
  }
}

export { registerDocumentation as registerProductDocumentation };

export function registerProductRoutes(
  app: OpenAPIHono<{ Variables: AppVariables }>,
  dependencies: Dependencies,
): void {
  registerDocumentation(app);
  const auth = (context: Parameters<PrincipalResolver>[0], scope: "read" | "write" = "read") =>
    principalFor(dependencies.principalResolver, context, scope);
  const params = <S extends z.ZodType>(
    context: { req: { param(): Record<string, string> } },
    schema: S,
  ): z.output<S> => parse(schema, context.req.param());
  const body = async <S extends z.ZodType>(
    context: { req: { json(): Promise<unknown> } },
    schema: S,
  ): Promise<z.output<S>> => parse(schema, await context.req.json());

  app.get("/v1/account/export", async (c) =>
    c.json(await dependencies.accountPrivacyService.exportAccount(await auth(c))),
  );
  app.post("/v1/account/delete", async (c) => {
    const input = await body(c, DeleteAccountInputSchema);
    return c.json(
      await dependencies.accountPrivacyService.deleteAccount(
        c.req.raw,
        await auth(c, "write"),
        input.email,
      ),
    );
  });

  app.get("/v1/workspaces", async (c) =>
    c.json(
      await dependencies.repository.listWorkspaces(
        await auth(c),
        parse(CursorQuerySchema, c.req.query()),
      ),
    ),
  );
  app.post("/v1/workspaces", async (c) =>
    c.json(
      await dependencies.repository.createWorkspace(
        await auth(c, "write"),
        await body(c, CreateWorkspaceInputSchema),
      ),
      201,
    ),
  );
  app.patch("/v1/workspaces/:workspaceId", async (c) => {
    const p = params(c, WorkspaceParams);
    return c.json(
      await dependencies.repository.updateWorkspace(
        p.workspaceId,
        await auth(c, "write"),
        await body(c, UpdateWorkspaceInputSchema),
      ),
    );
  });
  app.get("/v1/workspaces/:workspaceId/export", async (c) => {
    const p = params(c, WorkspaceParams);
    return c.json(await dependencies.repository.exportWorkspace(p.workspaceId, await auth(c)));
  });
  app.delete("/v1/workspaces/:workspaceId", async (c) => {
    const p = params(c, WorkspaceParams);
    await dependencies.repository.deleteWorkspace(p.workspaceId, await auth(c, "write"));
    return c.body(null, 204);
  });

  app.get("/v1/workspaces/:workspaceId/projects", async (c) => {
    const p = params(c, WorkspaceParams);
    return c.json(
      await dependencies.repository.listProjects(
        p.workspaceId,
        await auth(c),
        parse(ProjectListQuerySchema, c.req.query()),
      ),
    );
  });
  app.post("/v1/workspaces/:workspaceId/projects", async (c) => {
    const p = params(c, WorkspaceParams);
    return c.json(
      await dependencies.repository.createProject(
        p.workspaceId,
        await auth(c, "write"),
        await body(c, CreateProjectInputSchema),
        { idempotencyKey: idempotencyKey(c.req.raw.headers) },
      ),
      201,
    );
  });
  app.get("/v1/workspaces/:workspaceId/projects/:projectId", async (c) => {
    const p = params(c, ProjectParams);
    const value = await dependencies.repository.getProject(
      p.workspaceId,
      p.projectId,
      await auth(c),
    );
    if (!value) throw new DomainError("not_found", 404, "Project not found");
    return c.json(value);
  });
  app.patch("/v1/workspaces/:workspaceId/projects/:projectId", async (c) => {
    const p = params(c, ProjectParams);
    return c.json(
      await dependencies.repository.updateProject(
        p.workspaceId,
        p.projectId,
        await auth(c, "write"),
        await body(c, UpdateProjectInputSchema),
        { idempotencyKey: idempotencyKey(c.req.raw.headers) },
      ),
    );
  });
  app.delete("/v1/workspaces/:workspaceId/projects/:projectId", async (c) => {
    const p = params(c, ProjectParams);
    await dependencies.repository.deleteProject(
      p.workspaceId,
      p.projectId,
      await auth(c, "write"),
      { idempotencyKey: idempotencyKey(c.req.raw.headers) },
    );
    return c.body(null, 204);
  });

  app.get("/v1/workspaces/:workspaceId/task-queue", async (c) => {
    const p = params(c, WorkspaceParams);
    const query = parse(RestTaskQueueQuery, c.req.query());
    const principal = await auth(c);
    const limit = await dependencies.repository.consumeRateLimit(
      p.workspaceId,
      principal,
      TASK_QUEUE_BUCKET,
      TASK_QUEUE_WINDOW_SECONDS,
    );
    if (!limit.allowed) {
      c.header("Retry-After", String(limit.retryAfterSeconds));
      return c.json(
        presentProblem(
          new DomainError("rate_limited", 429, "One request per minute per principal"),
          c.req.path,
          c.get("traceId"),
        ),
        429,
      );
    }
    return c.json({
      data: await dependencies.repository.listTaskQueue(p.workspaceId, principal, query),
    });
  });

  app.get("/v1/workspaces/:workspaceId/tasks", async (c) => {
    const p = params(c, WorkspaceParams);
    return c.json(
      await dependencies.repository.listTasks(
        p.workspaceId,
        await auth(c),
        parse(RestTaskListQuery, c.req.query()),
      ),
    );
  });
  app.post("/v1/workspaces/:workspaceId/tasks", async (c) => {
    const p = params(c, WorkspaceParams);
    return c.json(
      await dependencies.repository.createTask(
        p.workspaceId,
        await auth(c, "write"),
        await body(c, RestCreateTask),
        { idempotencyKey: idempotencyKey(c.req.raw.headers) },
      ),
      201,
    );
  });
  app.get("/v1/workspaces/:workspaceId/tasks/:taskId", async (c) => {
    const p = params(c, TaskParams);
    const value = await dependencies.repository.getTask(p.workspaceId, p.taskId, await auth(c));
    if (!value) throw new DomainError("not_found", 404, "Task not found");
    c.header("ETag", `"${value.version}"`);
    return c.json(value);
  });
  app.patch("/v1/workspaces/:workspaceId/tasks/:taskId", async (c) => {
    const p = params(c, TaskParams);
    const value = await dependencies.repository.updateTask(
      p.workspaceId,
      p.taskId,
      await auth(c, "write"),
      parseVersion(c.req.header("if-match")),
      await body(c, RestUpdateTask),
      { idempotencyKey: idempotencyKey(c.req.raw.headers) },
    );
    c.header("ETag", `"${value.version}"`);
    return c.json(value);
  });
  app.delete("/v1/workspaces/:workspaceId/tasks/:taskId", async (c) => {
    const p = params(c, TaskParams);
    await dependencies.repository.deleteTask(
      p.workspaceId,
      p.taskId,
      await auth(c, "write"),
      parseVersion(c.req.header("if-match")),
      { idempotencyKey: idempotencyKey(c.req.raw.headers) },
    );
    return c.body(null, 204);
  });

  app.post("/v1/workspaces/:workspaceId/tasks/:taskId/claim", async (c) => {
    const p = params(c, TaskParams);
    const input = await body(c, RestClaim);
    return c.json(
      await dependencies.repository.claimTask(
        p.workspaceId,
        p.taskId,
        await auth(c, "write"),
        parseVersion(c.req.header("if-match")),
        input.leaseSeconds,
        { idempotencyKey: idempotencyKey(c.req.raw.headers) },
      ),
    );
  });
  app.post("/v1/workspaces/:workspaceId/tasks/:taskId/claim/extend", async (c) => {
    const p = params(c, TaskParams);
    const input = await body(c, RestExtend);
    return c.json(
      await dependencies.repository.extendClaim(
        p.workspaceId,
        p.taskId,
        await auth(c, "write"),
        parseVersion(c.req.header("if-match")),
        input.leaseSeconds,
        { idempotencyKey: idempotencyKey(c.req.raw.headers) },
      ),
    );
  });
  app.post("/v1/workspaces/:workspaceId/tasks/:taskId/claim/release", async (c) => {
    const p = params(c, TaskParams);
    await dependencies.repository.releaseClaim(
      p.workspaceId,
      p.taskId,
      await auth(c, "write"),
      parseVersion(c.req.header("if-match")),
      { idempotencyKey: idempotencyKey(c.req.raw.headers) },
    );
    return c.body(null, 204);
  });
  app.post("/v1/workspaces/:workspaceId/tasks/:taskId/handoff", async (c) => {
    const p = params(c, TaskParams);
    const input = await body(c, RestHandoff);
    return c.json(
      await dependencies.repository.handoffTask(
        p.workspaceId,
        p.taskId,
        await auth(c, "write"),
        { ...input, expectedVersion: parseVersion(c.req.header("if-match")) },
        { idempotencyKey: idempotencyKey(c.req.raw.headers) },
      ),
    );
  });
  app.post("/v1/workspaces/:workspaceId/tasks/:taskId/events", async (c) => {
    const p = params(c, TaskParams);
    const input = await body(c, RestEvent);
    return c.json(
      await dependencies.repository.recordTaskEvent(
        p.workspaceId,
        p.taskId,
        await auth(c, "write"),
        {
          ...input,
          expectedVersion: parseVersion(c.req.header("if-match")),
          origin: "rest",
          correlationId: c.get("traceId"),
        },
        { idempotencyKey: idempotencyKey(c.req.raw.headers) },
      ),
      201,
    );
  });
  app.get("/v1/workspaces/:workspaceId/tasks/:taskId/events", async (c) => {
    const p = params(c, TaskParams);
    return c.json(
      await dependencies.repository.listTaskEvents(p.workspaceId, p.taskId, await auth(c)),
    );
  });

  app.get("/v1/workspaces/:workspaceId/service-accounts", async (c) => {
    const p = params(c, WorkspaceParams);
    return c.json(await dependencies.repository.listServiceAccounts(p.workspaceId, await auth(c)));
  });
  app.post("/v1/workspaces/:workspaceId/service-accounts", async (c) => {
    const p = params(c, WorkspaceParams);
    return c.json(
      await dependencies.repository.createServiceAccount(
        p.workspaceId,
        await auth(c, "write"),
        await body(c, CreateServiceAccountInputSchema),
      ),
      201,
    );
  });
  app.delete("/v1/workspaces/:workspaceId/service-accounts/:serviceAccountId", async (c) => {
    const p = params(c, ServiceAccountParams);
    await dependencies.repository.revokeServiceAccount(
      p.workspaceId,
      p.serviceAccountId,
      await auth(c, "write"),
    );
    return c.body(null, 204);
  });
  app.get("/v1/workspaces/:workspaceId/api-tokens", async (c) => {
    const p = params(c, WorkspaceParams);
    return c.json(await dependencies.repository.listApiTokens(p.workspaceId, await auth(c)));
  });
  app.post("/v1/workspaces/:workspaceId/api-tokens", async (c) => {
    const p = params(c, WorkspaceParams);
    return c.json(
      await dependencies.repository.createApiToken(
        p.workspaceId,
        await auth(c, "write"),
        await body(c, CreateApiTokenInputSchema),
      ),
      201,
    );
  });
  app.delete("/v1/workspaces/:workspaceId/api-tokens/:tokenId", async (c) => {
    const p = params(c, TokenParams);
    await dependencies.repository.revokeApiToken(p.workspaceId, p.tokenId, await auth(c, "write"));
    return c.body(null, 204);
  });
}
