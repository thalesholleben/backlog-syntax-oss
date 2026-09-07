import type { WorkspaceContext } from "@backlog-syntax/contracts";
import { DomainError } from "./errors.js";
import type { Principal } from "./principal.js";

export interface WorkspaceContextRepository {
  findForPrincipal(workspaceId: string, principal: Principal): Promise<WorkspaceContext | null>;
}

export interface GetWorkspaceContextInput {
  workspaceId: string;
  principal: Principal;
}

export interface GetWorkspaceContextUseCase {
  execute(input: GetWorkspaceContextInput): Promise<WorkspaceContext>;
}

export function createGetWorkspaceContextUseCase(
  repository: WorkspaceContextRepository,
): GetWorkspaceContextUseCase {
  return {
    async execute(input) {
      const context = await repository.findForPrincipal(input.workspaceId, input.principal);
      if (!context) {
        throw new DomainError("not_found", 404, "Workspace not found");
      }
      return context;
    },
  };
}
