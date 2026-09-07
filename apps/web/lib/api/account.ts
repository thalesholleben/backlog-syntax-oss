import type {
  AccountDeletionReceipt,
  AccountExport,
  WorkspaceExport,
} from "@backlog-syntax/contracts";
import { apiClient } from "@/lib/api/client";

/**
 * LGPD data-subject rights (export, deletion). Not yet in AGENTS.md's agreed route list or in
 * @backlog-syntax/contracts; this follows the `/v1/account/*` convention used for MCP OAuth and
 * documents the gap explicitly rather than skipping the requirement (lgpd-baseline skill).
 */
export function exportAccountData(): Promise<AccountExport> {
  return apiClient.get<AccountExport>("/v1/account/export");
}

export function exportWorkspaceData(workspaceId: string): Promise<WorkspaceExport> {
  return apiClient.get<WorkspaceExport>(`/v1/workspaces/${workspaceId}/export`);
}

export function deleteAccount(email: string): Promise<AccountDeletionReceipt> {
  return apiClient.post<AccountDeletionReceipt>("/v1/account/delete", {
    confirmation: "excluir",
    email,
  });
}
