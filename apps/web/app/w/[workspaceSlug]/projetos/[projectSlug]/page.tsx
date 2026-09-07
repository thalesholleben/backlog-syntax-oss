"use client";

import { useParams } from "next/navigation";
import { BacklogView } from "@/components/backlog/backlog-view";

/** Mesmo quadro, já recortado no projeto da URL: o link do projeto continua valendo. */
export default function ProjectBoardPage() {
  const params = useParams<{ workspaceSlug: string; projectSlug: string }>();
  return <BacklogView workspaceSlug={params.workspaceSlug} projectSlug={params.projectSlug} />;
}
