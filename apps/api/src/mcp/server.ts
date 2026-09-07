import {
  IdentifierSchema,
  MCP_TOOL_CONTRACTS,
  McpScopeSchema,
  SubjectTypeSchema,
  WorkspaceContextParamsSchema,
  WorkspaceContextSchema,
  WorkspaceRoleSchema,
} from "@backlog-syntax/contracts";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Principal } from "../domain/principal.js";
import type { GetWorkspaceContextUseCase } from "../domain/workspace-context.js";
import { presentWorkspaceContextForMcp } from "./workspace-context-presenter.js";

export function callGetWorkspaceContextTool(
  useCase: GetWorkspaceContextUseCase,
  principal: Principal,
  input: unknown,
) {
  const parsed = WorkspaceContextParamsSchema.parse(input);
  return useCase
    .execute({ workspaceId: parsed.workspaceId, principal })
    .then(presentWorkspaceContextForMcp);
}

export function createWorkspaceContextMcpServer(
  useCase: GetWorkspaceContextUseCase,
  principal: Principal,
): McpServer {
  const server = new McpServer({ name: "backlog-syntax", version: "0.1.0" });
  const contract = MCP_TOOL_CONTRACTS.get_workspace_context;

  server.registerTool(
    "get_workspace_context",
    {
      description: contract.description,
      inputSchema: WorkspaceContextParamsSchema.shape,
      outputSchema: WorkspaceContextSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    (input) => callGetWorkspaceContextTool(useCase, principal, input),
  );

  return server;
}

const PrincipalSchema = z
  .object({
    subjectType: SubjectTypeSchema,
    subjectId: IdentifierSchema,
    role: WorkspaceRoleSchema,
    scopes: z.array(McpScopeSchema),
  })
  .strict();

export function createWorkspaceContextMcpHandler(useCase: GetWorkspaceContextUseCase) {
  return createMcpHandler(
    (context) => {
      const principal = PrincipalSchema.parse(context.authInfo?.extra?.principal);
      return createWorkspaceContextMcpServer(useCase, principal);
    },
    {
      legacy: "reject",
    },
  );
}
