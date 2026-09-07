"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { newIdempotencyKey } from "@/lib/api/client";
import {
  createProject,
  createWorkspace,
  listProjects,
  listWorkspaces,
  type ProjectSummary,
  type WorkspaceSummary,
} from "@/lib/api/workspaces";
import { useRequireSession } from "@/lib/use-require-session";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const steps = ["Conta", "Workspace", "Projeto"] as const;

export function OnboardingWizard() {
  const session = useRequireSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: ({ signal }) => listWorkspaces(signal),
    enabled: Boolean(session.data),
  });

  const projectsQuery = useQuery({
    queryKey: ["projects", workspace?.id],
    queryFn: ({ signal }) => listProjects(workspace?.id as string, signal),
    enabled: Boolean(workspace),
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: () =>
      createWorkspace(
        { name: newWorkspaceName, slug: slugify(newWorkspaceName) },
        newIdempotencyKey(),
      ),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setWorkspace(created);
    },
    onError: () => notify("error", "Não foi possível criar o workspace agora."),
  });

  const [newProjectName, setNewProjectName] = useState("");
  const createProjectMutation = useMutation({
    mutationFn: () => {
      if (!workspace) throw new Error("workspace ausente");
      return createProject(
        workspace.id,
        { name: newProjectName, slug: slugify(newProjectName) },
        newIdempotencyKey(),
      );
    },
    onSuccess: (project) => finish(project),
    onError: () => notify("error", "Não foi possível criar o projeto agora."),
  });

  function finish(project: ProjectSummary) {
    if (!workspace) return;
    router.push(`/w/${workspace.slug}/projetos/${project.slug}`);
  }

  const step = !session.data ? 0 : !workspace ? 1 : 2;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
      <ol className="mb-10 flex items-center gap-3" aria-label="Progresso do onboarding">
        {steps.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-3">
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                index < step
                  ? "bg-status-done text-background"
                  : index === step
                    ? "bg-accent text-accent-foreground"
                    : "border border-line text-muted"
              }`}
            >
              {index < step ? <Check aria-hidden="true" className="size-4" /> : index + 1}
            </span>
            <span
              className={`text-sm font-bold ${index === step ? "text-foreground" : "text-muted"}`}
            >
              {label}
            </span>
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="h-px flex-1 bg-line" />
            ) : null}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
              Escolha um workspace
            </h1>
            <p className="mt-2 text-sm text-muted">
              Cada workspace isola seus dados por RLS. Você pode criar quantos precisar.
            </p>
          </div>

          {workspacesQuery.isLoading ? (
            <p className="text-sm text-muted">Carregando workspaces…</p>
          ) : null}
          {workspacesQuery.isError ? (
            <p className="text-sm text-danger">Não foi possível carregar seus workspaces agora.</p>
          ) : null}

          {workspacesQuery.data && workspacesQuery.data.length > 0 ? (
            <ul className="space-y-2">
              {workspacesQuery.data.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setWorkspace(item)}
                    className="flex min-h-14 w-full items-center justify-between rounded-control border border-line bg-surface px-4 text-left font-semibold hover:border-foreground"
                  >
                    {item.name}
                    <span className="font-mono text-xs font-normal text-muted">{item.role}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <form
            className="space-y-3 rounded-card border border-line bg-surface p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (newWorkspaceName.trim()) createWorkspaceMutation.mutate();
            }}
          >
            <Field label="Novo workspace">
              {({ inputId }) => (
                <Input
                  id={inputId}
                  required
                  placeholder="Ex.: Minha equipe"
                  value={newWorkspaceName}
                  onChange={(event) => setNewWorkspaceName(event.target.value)}
                />
              )}
            </Field>
            <Button type="submit" isLoading={createWorkspaceMutation.isPending} className="w-full">
              Criar workspace
            </Button>
          </form>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Primeiro projeto</h1>
            <p className="mt-2 text-sm text-muted">
              Em <strong className="text-foreground">{workspace?.name}</strong>. Um projeto agrupa o
              quadro de tarefas.
            </p>
          </div>

          {projectsQuery.data && projectsQuery.data.length > 0 ? (
            <ul className="space-y-2">
              {projectsQuery.data.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => finish(project)}
                    className="flex min-h-14 w-full items-center justify-between rounded-control border border-line bg-surface px-4 text-left font-semibold hover:border-foreground"
                  >
                    {project.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <form
            className="space-y-3 rounded-card border border-line bg-surface p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (newProjectName.trim()) createProjectMutation.mutate();
            }}
          >
            <Field label="Novo projeto">
              {({ inputId }) => (
                <Input
                  id={inputId}
                  required
                  placeholder="Ex.: Backlog Syntax"
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                />
              )}
            </Field>
            <Button type="submit" isLoading={createProjectMutation.isPending} className="w-full">
              Criar projeto e abrir o quadro
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setWorkspace(null)}
            className="text-sm font-semibold text-muted hover:text-foreground"
          >
            Trocar de workspace
          </button>
        </div>
      ) : null}
    </div>
  );
}
