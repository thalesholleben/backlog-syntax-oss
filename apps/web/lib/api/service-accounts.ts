import type {
  CreatedApiTokenSchema,
  ServiceAccount,
  ServiceAccountScopeSchema,
} from "@backlog-syntax/contracts";
import type { z } from "zod";
import { apiClient } from "@/lib/api/client";

export type ServiceAccountScope = z.infer<typeof ServiceAccountScopeSchema>;
export type CreatedServiceAccountToken = z.infer<typeof CreatedApiTokenSchema>;

export function listServiceAccounts(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<ServiceAccount[]> {
  return apiClient.get<ServiceAccount[]>(`/v1/workspaces/${workspaceId}/service-accounts`, signal);
}

export function createServiceAccount(
  workspaceId: string,
  input: { name: string; description?: string },
  idempotencyKey: string,
): Promise<ServiceAccount> {
  return apiClient.post<ServiceAccount>(`/v1/workspaces/${workspaceId}/service-accounts`, input, {
    idempotencyKey,
  });
}

export function revokeServiceAccount(
  workspaceId: string,
  serviceAccountId: string,
  idempotencyKey: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/v1/workspaces/${workspaceId}/service-accounts/${serviceAccountId}`,
    { idempotencyKey },
  );
}

export function createServiceAccountToken(
  workspaceId: string,
  serviceAccountId: string,
  scopes: ServiceAccountScope[],
  idempotencyKey: string,
  name = "Token principal",
): Promise<CreatedServiceAccountToken> {
  return apiClient.post<CreatedServiceAccountToken>(
    `/v1/workspaces/${workspaceId}/api-tokens`,
    { serviceAccountId, name, scopes },
    { idempotencyKey },
  );
}

export function revokeServiceAccountToken(
  workspaceId: string,
  tokenId: string,
  idempotencyKey: string,
): Promise<void> {
  return apiClient.delete<void>(`/v1/workspaces/${workspaceId}/api-tokens/${tokenId}`, {
    idempotencyKey,
  });
}
