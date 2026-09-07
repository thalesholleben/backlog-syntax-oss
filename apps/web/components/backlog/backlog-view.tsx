"use client";

import type { Translator } from "@/lib/i18n/translate";

import { useI18n } from "@/lib/i18n/provider";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BacklogAging } from "@/components/backlog/backlog-aging";
import { BacklogCard } from "@/components/backlog/backlog-card";
import { BacklogColumn } from "@/components/backlog/backlog-column";
import { BacklogHero } from "@/components/backlog/backlog-hero";
import { ALL_PROJECTS, BacklogRail, RecentlyClosedPanel } from "@/components/backlog/backlog-rail";
import { CardGhost } from "@/components/backlog/card-ghost";
import { NewProjectDialog } from "@/components/backlog/new-project-dialog";
import { NewTaskDialog } from "@/components/backlog/new-task-dialog";
import { TaskDrawer } from "@/components/backlog/task-drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceNotFound } from "@/components/workspace-not-found";
import type { BoardTask } from "@/lib/backlog/board-task";
import { positionAfterLast } from "@/lib/backlog/position";
import { useTaskMutations, useTasks } from "@/lib/backlog/use-tasks";
import {
  ageInDays,
  COLUMNS,
  matchesSearch,
  type Owner,
  ownerOf,
  startOfToday,
  withAge,
} from "@/lib/backlog/view-model";
import type { TaskPriority, TaskStatus } from "@/lib/domain-types";
import { statusLabel } from "@/lib/task-presentation";
import { useActiveWorkspace } from "@/lib/use-active-workspace";

type OwnerFilter = Owner | "todos";

const PIN_KEY = "bl-projeto-fixado";

const OWNER_CUT = (t: Translator): Record<OwnerFilter, string> => ({
  todos: "",
  human: t("de pessoas"),
  agent: t("de agentes"),
  free: t("sem responsável"),
});

export function BacklogView({
  workspaceSlug,
  projectSlug,
}: {
  workspaceSlug: string;
  projectSlug?: string;
}) {
  const { t } = useI18n();

  const { summary, workspacesQuery, contextQuery } = useActiveWorkspace(workspaceSlug);
  const workspaceId = summary?.id ?? "";
  const tasksQuery = useTasks(workspaceId);
  const mutations = useTaskMutations(workspaceId);

  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("todos");
  const [projectFilter, setProjectFilter] = useState<string>(projectSlug ?? ALL_PROJECTS);
  const [pinned, setPinned] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [dragging, setDragging] = useState<BoardTask | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [newTask, setNewTask] = useState(false);
  const [newProject, setNewProject] = useState(false);

  /* O projeto fixado só vale como padrão de abertura: uma rota de projeto ganha dele. */
  useEffect(() => {
    if (projectSlug) return;
    try {
      const saved = localStorage.getItem(PIN_KEY);
      if (saved) {
        setPinned(saved);
        setProjectFilter(saved);
      }
    } catch {
      /* sem storage, o quadro abre em todos os projetos */
    }
  }, [projectSlug]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    // O Enter precisa continuar acionando o botão que abre o card, então só o
    // Espaço inicia um arrasto por teclado.
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const projects = useMemo(() => contextQuery.data?.projects ?? [], [contextQuery.data]);
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const activeProjectId = useMemo(
    () => projects.find((project) => project.slug === projectFilter)?.id ?? null,
    [projects, projectFilter],
  );

  const allTasks: BoardTask[] = useMemo(() => tasksQuery.data?.data ?? [], [tasksQuery.data]);

  /* Base do quadro: projeto e busca. O filtro por responsável entra depois,
     porque os próprios botões de responsável precisam contar dentro desta base. */
  const base = useMemo(
    () =>
      allTasks.filter(
        (task) =>
          (projectFilter === ALL_PROJECTS || task.projectId === activeProjectId) &&
          matchesSearch(task, search),
      ),
    [allTasks, projectFilter, activeProjectId, search],
  );

  const today = useMemo(() => startOfToday(), []);
  const open = useMemo(() => base.filter((task) => task.status !== "done"), [base]);

  const daysById = useMemo(
    () => new Map(allTasks.map((task) => [task.id, ageInDays(task.createdAt, today)])),
    [allTasks, today],
  );

  const openByOwner = useMemo(() => {
    const counts: Record<Owner, number> = { human: 0, agent: 0, free: 0 };
    for (const task of open) counts[ownerOf(task)] += 1;
    return counts;
  }, [open]);

  const countsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const column of COLUMNS) counts[column.key] = 0;
    for (const task of base) counts[task.status] = (counts[task.status] ?? 0) + 1;
    return counts;
  }, [base]);

  const countByProject = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of allTasks) {
      if (task.status === "done") continue;
      counts.set(task.projectId, (counts.get(task.projectId) ?? 0) + 1);
    }
    return counts;
  }, [allTasks]);

  const byStatus = useMemo(() => {
    const groups: Record<TaskStatus, BoardTask[]> = {
      open: [],
      in_progress: [],
      blocked: [],
      done: [],
    };
    for (const task of base) {
      if (ownerFilter !== "todos" && ownerOf(task) !== ownerFilter) continue;
      groups[task.status].push(task);
    }
    for (const status of Object.keys(groups) as TaskStatus[]) {
      groups[status].sort((a, b) => Number(a.position) - Number(b.position));
    }
    return groups;
  }, [base, ownerFilter]);

  const agingItems = useMemo(
    () =>
      withAge(
        open.filter((task) => ownerFilter === "todos" || ownerOf(task) === ownerFilter),
        today,
      ),
    [open, ownerFilter, today],
  );

  const recentlyClosed = useMemo(
    () =>
      base
        .filter((task) => task.status === "done")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6),
    [base],
  );

  const detailsTask = details ? (allTasks.find((task) => task.id === details) ?? null) : null;

  /* Recorte em texto, usado na mensagem de coluna vazia: sem ele o quadro diz
     "nada aqui" mesmo quando existem tarefas escondidas por um filtro. */
  const cut = [
    OWNER_CUT(t)[ownerFilter],
    projectFilter === ALL_PROJECTS
      ? ""
      : t("em {0}", {
          "0": projects.find((project) => project.slug === projectFilter)?.name ?? projectFilter,
        }),
    search.trim() ? t("com “{0}”", { "0": search.trim() }) : "",
  ]
    .filter(Boolean)
    .join(" ");

  function moveTask(task: BoardTask, status: TaskStatus) {
    if (status === task.status) return;
    mutations.update.mutate({
      workspaceId,
      taskId: task.id,
      expectedVersion: task.version,
      patch: { status, position: positionAfterLast(byStatus[status].at(-1)?.position) },
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const status = event.over?.data.current?.status as TaskStatus | undefined;
    const taskId = event.active.data.current?.taskId as string | undefined;
    const task = allTasks.find((item) => item.id === taskId);
    if (status && task) moveTask(task, status);
  }

  function handleDragStart(event: DragStartEvent) {
    const taskId = event.active.data.current?.taskId as string | undefined;
    setDragging(allTasks.find((task) => task.id === taskId) ?? null);
  }

  function pinProject(slug: string) {
    const next = pinned === slug ? null : slug;
    setPinned(next);
    if (next) setProjectFilter(next);
    try {
      if (next) localStorage.setItem(PIN_KEY, next);
      else localStorage.removeItem(PIN_KEY);
    } catch {
      /* sem storage o pin vale só nesta aba */
    }
  }

  if (workspacesQuery.isLoading || contextQuery.isLoading || tasksQuery.isLoading) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <Skeleton className="h-[70px] w-full rounded-card" />
        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_290px]">
          <Skeleton className="h-[420px] rounded-card" />
          <Skeleton className="h-[420px] rounded-card" />
        </div>
      </div>
    );
  }

  if (workspacesQuery.isError || contextQuery.isError || tasksQuery.isError) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-display text-xl font-bold">{t("Não foi possível carregar o quadro")}</p>
        <p className="mt-2 text-sm text-muted">
          {t("Verifique a conexão com a API e tente de novo.")}
        </p>
        <Button
          size="sm"
          className="mt-5"
          isLoading={workspacesQuery.isFetching || contextQuery.isFetching || tasksQuery.isFetching}
          onClick={() => {
            void workspacesQuery.refetch();
            void contextQuery.refetch();
            void tasksQuery.refetch();
          }}
        >
          {t("Tentar novamente")}
        </Button>
      </div>
    );
  }

  if (!summary) {
    return <WorkspaceNotFound fallbackSlug={workspacesQuery.data?.[0]?.slug} />;
  }

  return (
    <div className="bl-glow px-3 pb-9 pt-5 sm:px-6">
      <BacklogHero
        workspaceName={`${summary.name} · workspace`}
        kpis={{
          open: open.length,
          human: openByOwner.human,
          agent: openByOwner.agent,
          done: base.filter((task) => task.status === "done").length,
        }}
        counts={{
          todos: open.length,
          human: openByOwner.human,
          agent: openByOwner.agent,
          free: openByOwner.free,
        }}
        ownerFilter={ownerFilter}
        onOwnerFilter={setOwnerFilter}
        search={search}
        onSearch={setSearch}
        onNewTask={() => setNewTask(true)}
      />

      <DndContext
        sensors={sensors}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(null)}
        accessibility={{
          screenReaderInstructions: {
            draggable: t(
              "Pressione espaço para pegar uma tarefa, use as setas para mover e espaço para soltar. Escape cancela.",
            ),
          },
          announcements: {
            onDragStart: ({ active }) =>
              t("Pegou a tarefa {0}.", {
                "0": allTasks.find((t) => t.id === active.data.current?.taskId)?.title ?? "",
              }),
            onDragOver: ({ over }) =>
              over
                ? t("Sobre a coluna {0}.", {
                    "0": t(statusLabel[(over.data.current?.status as TaskStatus) ?? "open"]),
                  })
                : "",
            onDragEnd: ({ active, over }) => {
              const title = allTasks.find((t) => t.id === active.data.current?.taskId)?.title ?? "";
              const status = over?.data.current?.status as TaskStatus | undefined;
              return status
                ? t("Tarefa {0} movida para {1}.", { "0": title, "1": t(statusLabel[status]) })
                : t("Tarefa {0} solta sem mudar de coluna.", { "0": title });
            },
            onDragCancel: () => t("Movimento cancelado."),
          },
        }}
      >
        <div className="mb-3 grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_290px]">
          <section
            aria-label={t("Quadro do backlog")}
            className="rounded-card bg-ink p-3 shadow-deck"
          >
            <div className="grid grid-cols-1 items-start gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {COLUMNS.map((column) => {
                const tasks = byStatus[column.key];
                return (
                  <BacklogColumn
                    key={column.key}
                    column={{
                      ...column,
                      empty: cut ? t("nada {0} aqui", { "0": cut }) : column.empty,
                    }}
                    count={tasks.length}
                    empty={tasks.length === 0}
                  >
                    {tasks.map((task) => (
                      <BacklogCard
                        key={task.id}
                        task={task}
                        owner={ownerOf(task)}
                        days={daysById.get(task.id) ?? 0}
                        projectName={projectById.get(task.projectId)?.name ?? t("sem projeto")}
                        workspaceId={workspaceId}
                        open={openCard === task.id}
                        onToggle={() => setOpenCard(openCard === task.id ? null : task.id)}
                        onChangeStatus={(status) => moveTask(task, status)}
                        onChangePriority={(priority: TaskPriority) =>
                          mutations.update.mutate({
                            workspaceId,
                            taskId: task.id,
                            expectedVersion: task.version,
                            patch: { priority },
                          })
                        }
                        onChangeDueDate={(dueDate) =>
                          mutations.update.mutate({
                            workspaceId,
                            taskId: task.id,
                            expectedVersion: task.version,
                            patch: { dueDate },
                          })
                        }
                        onOpenDetails={() => setDetails(task.id)}
                        onDelete={() => mutations.softDelete(workspaceId, task)}
                      />
                    ))}
                  </BacklogColumn>
                );
              })}
            </div>
          </section>

          <aside className="flex flex-col gap-3 max-xl:flex-row max-xl:flex-wrap xl:sticky xl:top-[18px]">
            <BacklogRail
              openByOwner={openByOwner}
              countsByStatus={countsByStatus}
              projects={projects}
              countByProject={countByProject}
              activeProject={projectFilter}
              pinnedProject={pinned}
              onFilterProject={setProjectFilter}
              onPinProject={pinProject}
              onNewProject={() => setNewProject(true)}
            />
          </aside>
        </div>

        {typeof document !== "undefined"
          ? createPortal(
              <DragOverlay dropAnimation={null}>
                {dragging ? (
                  <CardGhost
                    task={dragging}
                    owner={ownerOf(dragging)}
                    projectName={projectById.get(dragging.projectId)?.name ?? t("sem projeto")}
                  />
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </DndContext>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_290px]">
        <BacklogAging items={agingItems} />
        <aside className="flex flex-col gap-3">
          <RecentlyClosedPanel recentlyClosed={recentlyClosed} />
        </aside>
      </div>

      <footer className="mt-3.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-2.5 font-mono text-[10.5px] leading-[1.7] tracking-[0.02em] text-faint">
        <p>
          {t(
            "Clique no card para abrir, arraste para mudar de coluna. Toda mudança grava na hora, com versão e trilha de eventos.",
          )}
        </p>
        <p>
          {t("O mesmo quadro pela")} <b className="font-bold text-muted">{t("API REST")}</b>{" "}
          {t("e pelo")} <b className="font-bold text-muted">MCP</b>
          {t(", para pessoa e agente verem o mesmo estado.")}
        </p>
      </footer>

      <NewTaskDialog
        open={newTask}
        onClose={() => setNewTask(false)}
        workspaceId={workspaceId}
        projects={projects}
        defaultProjectId={activeProjectId ?? projects[0]?.id ?? ""}
      />
      <NewProjectDialog
        open={newProject}
        onClose={() => setNewProject(false)}
        workspaceId={workspaceId}
      />
      {detailsTask ? (
        <TaskDrawer workspaceId={workspaceId} task={detailsTask} onClose={() => setDetails(null)} />
      ) : null}
    </div>
  );
}
