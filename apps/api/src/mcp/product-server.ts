import {
  MCP_TOOL_CONTRACTS,
  McpScopeSchema,
  SubjectTypeSchema,
  TaskClaimSchema,
  TaskEventSchema,
  TaskListSchema,
  TaskSchema,
  WorkspaceListSchema,
  WorkspaceRoleSchema,
  WorkspaceContextSchema,
} from "@backlog-syntax/contracts";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { DomainError } from "../domain/errors.js";
import type { Principal } from "../domain/principal.js";
import type { PostgresProductRepository } from "../infrastructure/postgres-product-repository.js";
import {
  presentReleasedClaim,
  presentTask,
  presentTaskClaim,
  presentTaskEvent,
  presentTaskList,
  presentWorkspaceContext,
  presentWorkspaceList,
} from "./product-presenter.js";

const PrincipalSchema = z
  .object({
    subjectType: SubjectTypeSchema,
    subjectId: z.uuid(),
    role: WorkspaceRoleSchema.default("viewer"),
    scopes: z.array(McpScopeSchema),
    workspaceId: z.uuid().optional(),
    authentication: z.enum(["session", "oauth", "pat", "test"]).optional(),
  })
  .strict();

function requireScope(principal: Principal, scope: "read" | "write"): void {
  if (!principal.scopes.includes(scope) && !principal.scopes.includes("admin")) {
    throw new DomainError("forbidden", 403, `${scope} scope is required`);
  }
}

export function createProductMcpHandler(repository: PostgresProductRepository) {
  return createMcpHandler(
    (requestContext) => {
      const principal = PrincipalSchema.parse(requestContext.authInfo?.extra?.principal);
      requireScope(principal, "read");
      const server = new McpServer({ name: "backlog-syntax", version: "0.1.0" });
      const mutation = (id: string | number) => ({ idempotencyKey: `mcp:${String(id)}` });

      server.registerTool(
        "list_workspaces",
        {
          description: MCP_TOOL_CONTRACTS.list_workspaces.description,
          inputSchema: MCP_TOOL_CONTRACTS.list_workspaces.inputSchema,
          outputSchema: WorkspaceListSchema,
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
        },
        (input) => repository.listWorkspaces(principal, input).then(presentWorkspaceList),
      );
      server.registerTool(
        "get_workspace_context",
        {
          description: MCP_TOOL_CONTRACTS.get_workspace_context.description,
          inputSchema: MCP_TOOL_CONTRACTS.get_workspace_context.inputSchema,
          outputSchema: WorkspaceContextSchema,
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
        },
        async (input) => {
          const value = await repository.getWorkspaceContext(input.workspaceId, principal);
          if (!value) throw new DomainError("not_found", 404, "Workspace not found");
          return presentWorkspaceContext(value);
        },
      );
      server.registerTool(
        "list_tasks",
        {
          description: MCP_TOOL_CONTRACTS.list_tasks.description,
          inputSchema: MCP_TOOL_CONTRACTS.list_tasks.inputSchema,
          outputSchema: TaskListSchema,
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
        },
        (input) => repository.listTasks(input.workspaceId, principal, input).then(presentTaskList),
      );
      server.registerTool(
        "get_task",
        {
          description: MCP_TOOL_CONTRACTS.get_task.description,
          inputSchema: MCP_TOOL_CONTRACTS.get_task.inputSchema,
          outputSchema: TaskSchema,
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
        },
        async (input) => {
          const value = await repository.getTask(input.workspaceId, input.taskId, principal);
          if (!value) throw new DomainError("not_found", 404, "Task not found");
          return presentTask(value);
        },
      );
      server.registerTool(
        "create_task",
        {
          description: MCP_TOOL_CONTRACTS.create_task.description,
          inputSchema: MCP_TOOL_CONTRACTS.create_task.inputSchema,
          outputSchema: TaskSchema,
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        },
        async (input, context) => {
          requireScope(principal, "write");
          const value = await repository.createTask(
            input.workspaceId,
            principal,
            input,
            mutation(context.mcpReq.id),
          );
          return presentTask(value);
        },
      );
      server.registerTool(
        "update_task",
        {
          description: MCP_TOOL_CONTRACTS.update_task.description,
          inputSchema: MCP_TOOL_CONTRACTS.update_task.inputSchema,
          outputSchema: TaskSchema,
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        },
        async (input, context) => {
          requireScope(principal, "write");
          const value = await repository.updateTask(
            input.workspaceId,
            input.taskId,
            principal,
            input.expectedVersion,
            input.patch,
            mutation(context.mcpReq.id),
          );
          return presentTask(value);
        },
      );
      server.registerTool(
        "claim_task",
        {
          description: MCP_TOOL_CONTRACTS.claim_task.description,
          inputSchema: MCP_TOOL_CONTRACTS.claim_task.inputSchema,
          outputSchema: TaskClaimSchema,
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        },
        async (input, context) => {
          requireScope(principal, "write");
          const value = await repository.claimTask(
            input.workspaceId,
            input.taskId,
            principal,
            input.expectedVersion,
            input.leaseSeconds,
            mutation(context.mcpReq.id),
          );
          return presentTaskClaim(value);
        },
      );
      server.registerTool(
        "extend_claim",
        {
          description: MCP_TOOL_CONTRACTS.extend_claim.description,
          inputSchema: MCP_TOOL_CONTRACTS.extend_claim.inputSchema,
          outputSchema: TaskClaimSchema,
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        },
        async (input, context) => {
          requireScope(principal, "write");
          const value = await repository.extendClaim(
            input.workspaceId,
            input.taskId,
            principal,
            input.expectedVersion,
            input.leaseSeconds,
            mutation(context.mcpReq.id),
          );
          return presentTaskClaim(value);
        },
      );
      server.registerTool(
        "release_claim",
        {
          description: MCP_TOOL_CONTRACTS.release_claim.description,
          inputSchema: MCP_TOOL_CONTRACTS.release_claim.inputSchema,
          outputSchema: z.object({ released: z.literal(true) }),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        },
        async (input, context) => {
          requireScope(principal, "write");
          await repository.releaseClaim(
            input.workspaceId,
            input.taskId,
            principal,
            input.expectedVersion,
            mutation(context.mcpReq.id),
          );
          return presentReleasedClaim();
        },
      );
      server.registerTool(
        "handoff_task",
        {
          description: MCP_TOOL_CONTRACTS.handoff_task.description,
          inputSchema: MCP_TOOL_CONTRACTS.handoff_task.inputSchema,
          outputSchema: TaskClaimSchema,
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        },
        async (input, context) => {
          requireScope(principal, "write");
          const value = await repository.handoffTask(
            input.workspaceId,
            input.taskId,
            principal,
            input,
            mutation(context.mcpReq.id),
          );
          return presentTaskClaim(value);
        },
      );
      server.registerTool(
        "record_task_event",
        {
          description: MCP_TOOL_CONTRACTS.record_task_event.description,
          inputSchema: MCP_TOOL_CONTRACTS.record_task_event.inputSchema,
          outputSchema: TaskEventSchema,
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        },
        async (input, context) => {
          requireScope(principal, "write");
          const value = await repository.recordTaskEvent(
            input.workspaceId,
            input.taskId,
            principal,
            { ...input, origin: "mcp", correlationId: String(context.mcpReq.id) },
            mutation(context.mcpReq.id),
          );
          return presentTaskEvent(value);
        },
      );
      return server;
    },
    {
      legacy: "reject",
      onerror: (error) => {
        console.error(
          JSON.stringify({ level: "error", event: "mcp_request_error", errorName: error.name }),
        );
      },
    },
  );
}
