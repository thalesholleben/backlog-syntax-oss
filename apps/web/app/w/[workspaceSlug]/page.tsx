"use client";

import { useParams } from "next/navigation";
import { BacklogView } from "@/components/backlog/backlog-view";

export default function WorkspaceBoardPage() {
  const params = useParams<{ workspaceSlug: string }>();
  return <BacklogView workspaceSlug={params.workspaceSlug} />;
}
