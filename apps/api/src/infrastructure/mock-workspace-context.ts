import type { WorkspaceContext } from "@backlog-syntax/contracts";
import type { Principal } from "../domain/principal.js";
import type { WorkspaceContextRepository } from "../domain/workspace-context.js";

export const FOUNDATION_FIXTURE = {
  workspaceId: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7531",
  projectId: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7532",
  userId: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7533",
} as const;

export class MockWorkspaceContextRepository implements WorkspaceContextRepository {
  public async findForPrincipal(
    workspaceId: string,
    principal: Principal,
  ): Promise<WorkspaceContext | null> {
    if (
      workspaceId !== FOUNDATION_FIXTURE.workspaceId ||
      principal.subjectType !== "user" ||
      principal.subjectId !== FOUNDATION_FIXTURE.userId
    ) {
      return null;
    }

    return {
      workspace: {
        id: FOUNDATION_FIXTURE.workspaceId,
        name: "Foundation workspace",
        slug: "foundation",
      },
      principal: {
        subjectType: principal.subjectType,
        subjectId: principal.subjectId,
        role: "owner",
      },
      projects: [
        {
          id: FOUNDATION_FIXTURE.projectId,
          name: "Backlog Syntax",
          slug: "backlog-syntax",
          updatedAt: "2026-08-31T12:00:00Z",
        },
      ],
    };
  }
}
