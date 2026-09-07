"use client";

import { useQuery } from "@tanstack/react-query";
import { getWorkspaceContext, listWorkspaces } from "@/lib/api/workspaces";

export function useActiveWorkspace(workspaceSlug: string) {
  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: ({ signal }) => listWorkspaces(signal),
  });

  const summary = workspacesQuery.data?.find((item) => item.slug === workspaceSlug) ?? null;

  const contextQuery = useQuery({
    queryKey: ["workspace-context", summary?.id],
    queryFn: ({ signal }) => getWorkspaceContext(summary?.id as string, signal),
    enabled: Boolean(summary),
  });

  return { summary, workspacesQuery, contextQuery };
}
