import type {
  Project,
  ProjectListSchema,
  Workspace,
  WorkspaceContext,
  WorkspaceListSchema,
} from "@backlog-syntax/contracts";
import type { z } from "zod";
import { apiClient } from "@/lib/api/client";

export type WorkspaceSummary = Workspace;
export type ProjectSummary = Project;
type WorkspaceList = z.infer<typeof WorkspaceListSchema>;
type ProjectList = z.infer<typeof ProjectListSchema>;

export function listWorkspaces(signal?: AbortSignal): Promise<WorkspaceSummary[]> {
  return apiClient.get<WorkspaceList>("/v1/workspaces", signal).then((page) => page.data);
}

export function createWorkspace(
  input: { name: string; slug: string },
  idempotencyKey: string,
): Promise<WorkspaceSummary> {
  return apiClient.post<WorkspaceSummary>("/v1/workspaces", input, { idempotencyKey });
}

export function getWorkspaceContext(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<WorkspaceContext> {
  return apiClient.get<WorkspaceContext>(`/v1/workspaces/${workspaceId}/context`, signal);
}

export function listProjects(workspaceId: string, signal?: AbortSignal): Promise<ProjectSummary[]> {
  return apiClient
    .get<ProjectList>(`/v1/workspaces/${workspaceId}/projects`, signal)
    .then((page) => page.data);
}

/** `withTasks` e' a intencao explicita de levar as tarefas junto; sem ela a API recusa. */
export function deleteProject(
  workspaceId: string,
  projectId: string,
  withTasks: boolean,
  idempotencyKey: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/v1/workspaces/${workspaceId}/projects/${projectId}?withTasks=${withTasks ? "true" : "false"}`,
    { idempotencyKey },
  );
}

export function createProject(
  workspaceId: string,
  input: { name: string; slug: string },
  idempotencyKey: string,
): Promise<ProjectSummary> {
  return apiClient.post<ProjectSummary>(`/v1/workspaces/${workspaceId}/projects`, input, {
    idempotencyKey,
  });
}
