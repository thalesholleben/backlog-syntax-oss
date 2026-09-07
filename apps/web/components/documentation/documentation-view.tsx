"use client";

import { useParams } from "next/navigation";
import { DocumentationContent } from "@/components/documentation/documentation-content";
import { env } from "@/lib/env";
import { useActiveWorkspace } from "@/lib/use-active-workspace";

export function DocumentationView() {
  const params = useParams<{ workspaceSlug: string }>();
  const { summary } = useActiveWorkspace(params.workspaceSlug);

  return (
    <DocumentationContent
      apiUrl={env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}
      workspaceId={summary?.id ?? "WORKSPACE_ID"}
      workspaceName={summary?.name ?? "workspace"}
    />
  );
}
