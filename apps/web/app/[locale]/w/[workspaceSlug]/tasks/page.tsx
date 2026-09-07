"use client";

import { useParams } from "next/navigation";
import { TasksView } from "@/components/tasks/tasks-view";

export default function WorkspaceTasksPage() {
  const params = useParams<{ workspaceSlug: string }>();
  return <TasksView workspaceSlug={params.workspaceSlug} />;
}
