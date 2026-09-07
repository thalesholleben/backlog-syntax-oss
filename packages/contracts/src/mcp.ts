import { z } from "@hono/zod-openapi";
import { CursorQuerySchema } from "./common.js";
import {
  ClaimTaskInputSchema,
  CreateTaskInputSchema,
  ExtendClaimInputSchema,
  GetTaskInputSchema,
  HandoffTaskInputSchema,
  ListTasksInputSchema,
  RecordTaskEventInputSchema,
  ReleaseClaimInputSchema,
  UpdateTaskInputSchema,
} from "./task.js";
import { WorkspaceContextParamsSchema } from "./workspace.js";

export const McpScopeSchema = z.enum(["read", "write", "admin"]);
export const ServiceAccountScopeSchema = z.enum(["read", "write"]);

export const MCP_TOOL_CONTRACTS = {
  list_workspaces: {
    description:
      "Discover the authenticated user's accessible workspaces. Call first without arguments; follow page.nextCursor while page.hasMore. If none exist, create a workspace in the web app. Choose a returned id before calling workspace tools; ask the user when multiple workspaces are available.",
    inputSchema: CursorQuerySchema.extend({ limit: z.number().int().min(1).max(100).default(20) }),
    requiredScope: "read",
  },
  get_workspace_context: {
    description:
      "Return the trusted workspace, principal and project context. Use a workspaceId returned by list_workspaces.",
    inputSchema: WorkspaceContextParamsSchema,
    requiredScope: "read",
  },
  list_tasks: {
    description: "List visible tasks with cursor pagination.",
    inputSchema: ListTasksInputSchema,
    requiredScope: "read",
  },
  get_task: {
    description: "Read one visible task by identifier.",
    inputSchema: GetTaskInputSchema,
    requiredScope: "read",
  },
  create_task: {
    description: "Create a task in an accessible project.",
    inputSchema: CreateTaskInputSchema,
    requiredScope: "write",
  },
  update_task: {
    description: "Update a task using optimistic concurrency.",
    inputSchema: UpdateTaskInputSchema,
    requiredScope: "write",
  },
  claim_task: {
    description: "Atomically claim a task for a bounded lease.",
    inputSchema: ClaimTaskInputSchema,
    requiredScope: "write",
  },
  extend_claim: {
    description: "Extend the active principal's task claim.",
    inputSchema: ExtendClaimInputSchema,
    requiredScope: "write",
  },
  release_claim: {
    description: "Release the active principal's task claim.",
    inputSchema: ReleaseClaimInputSchema,
    requiredScope: "write",
  },
  handoff_task: {
    description: "Handoff a claimed task with an auditable note.",
    inputSchema: HandoffTaskInputSchema,
    requiredScope: "write",
  },
  record_task_event: {
    description: "Append evidence, a decision request, a decision or a comment.",
    inputSchema: RecordTaskEventInputSchema,
    requiredScope: "write",
  },
} as const;

export type McpToolName = keyof typeof MCP_TOOL_CONTRACTS;
