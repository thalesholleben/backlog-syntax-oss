"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CalendarDays, Check, ChevronLeft, ChevronRight, GripVertical, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ThemeToggle } from "@/components/backlog/backlog-hero";
import { NewTaskDialog } from "@/components/backlog/new-task-dialog";
import { OwnerAvatar } from "@/components/backlog/owner-avatar";
import { TaskDrawer } from "@/components/backlog/task-drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceNotFound } from "@/components/workspace-not-found";
import type { BoardTask } from "@/lib/backlog/board-task";
import { positionAfterLast } from "@/lib/backlog/position";
import { useTaskMutations, useTasks } from "@/lib/backlog/use-tasks";
import { ownerOf } from "@/lib/backlog/view-model";
import {
  addDays,
  columnForTask,
  daysFromToday,
  isoDate,
  shortDay,
  startOfWeek,
  type WeekColumn,
  weekColumns,
} from "@/lib/tasks/week";
import { useActiveWorkspace } from "@/lib/use-active-workspace";

function weekRangeLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  return `${formatter.format(monday)} a ${formatter.format(sunday)}`;
}

function dueLabel(date: string): string {
  const days = daysFromToday(date);
  if (days < 0) return `venceu há ${Math.abs(days)}d`;
  if (days === 0) return "vence hoje";
  return `vence em ${days}d`;
}

export function TasksView({ workspaceSlug }: { workspaceSlug: string }) {
  const { summary, workspacesQuery, contextQuery } = useActiveWorkspace(workspaceSlug);
  const workspaceId = summary?.id ?? "";
  const tasksQuery = useTasks(workspaceId);
  const mutations = useTaskMutations(workspaceId);
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const [dragging, setDragging] = useState<BoardTask | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const columns = useMemo(() => weekColumns(monday), [monday]);
  const tasks: BoardTask[] = useMemo(() => tasksQuery.data?.data ?? [], [tasksQuery.data]);
  const projects = useMemo(() => contextQuery.data?.projects ?? [], [contextQuery.data]);
  const detailsTask = tasks.find((task) => task.id === detailsId) ?? null;
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const scheduled = useMemo(
    () =>
      new Map(
        columns.map((column) => [
          column.key,
          tasks
            .filter((task) => columnForTask(task, columns)?.key === column.key)
            .sort((a, b) => Number(a.position) - Number(b.position)),
        ]),
      ),
    [columns, tasks],
  );
  const unscheduled = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== "done" && !columnForTask(task, columns))
        .sort((a, b) => {
          if (!a.scheduledDate && b.scheduledDate) return -1;
          if (a.scheduledDate && !b.scheduledDate) return 1;
          return (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "");
        }),
    [columns, tasks],
  );

  const today = isoDate(new Date());
  const sunday = columns.at(-1)?.dates.at(-1) ?? today;
  const thisWeek = tasks.filter((task) => columnForTask(task, columns));
  const kpis = {
    left: thisWeek.filter((task) => task.status !== "done").length,
    done: thisWeek.filter((task) => task.status === "done").length,
    overdue: tasks.filter((task) => task.status !== "done" && task.dueDate && task.dueDate < today)
      .length,
    due: tasks.filter(
      (task) =>
        task.status !== "done" && task.dueDate && task.dueDate >= today && task.dueDate <= sunday,
    ).length,
  };

  function updateSchedule(task: BoardTask, scheduledDate: string | null, position?: string) {
    if (task.scheduledDate === scheduledDate && position === undefined) return;
    mutations.update.mutate({
      workspaceId,
      taskId: task.id,
      expectedVersion: task.version,
      patch: { scheduledDate, ...(position ? { position } : {}) },
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const taskId = event.active.data.current?.taskId as string | undefined;
    const date = event.over?.data.current?.scheduleDate as string | null | undefined;
    const task = tasks.find((item) => item.id === taskId);
    if (!task || date === undefined) return;
    const destination = columns.find((column) => column.scheduleDate === date);
    const last = destination ? scheduled.get(destination.key)?.at(-1) : unscheduled.at(-1);
    updateSchedule(task, date, positionAfterLast(last?.position));
  }

  if (workspacesQuery.isLoading || contextQuery.isLoading || tasksQuery.isLoading) {
    return (
      <div className="px-3 py-5 sm:px-6">
        <Skeleton className="h-[76px] rounded-card" />
        <Skeleton className="mt-3 h-[420px] rounded-card" />
      </div>
    );
  }

  if (workspacesQuery.isError || contextQuery.isError || tasksQuery.isError) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-display text-xl font-bold">Não foi possível carregar a agenda</p>
        <p className="mt-2 text-sm text-muted">Verifique a conexão com a API e tente de novo.</p>
        <Button
          className="mt-5"
          size="sm"
          isLoading={workspacesQuery.isFetching || contextQuery.isFetching || tasksQuery.isFetching}
          onClick={() => {
            void workspacesQuery.refetch();
            void contextQuery.refetch();
            void tasksQuery.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!summary) {
    return <WorkspaceNotFound fallbackSlug={workspacesQuery.data?.[0]?.slug} />;
  }

  return (
    <div className="bl-glow overflow-x-clip px-3 pb-10 pt-5 sm:px-6">
      <header className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3.5 rounded-card bg-surface px-[18px] py-3.5 shadow-card">
        <div className="flex shrink-0 items-center gap-3">
          <span className="grid size-[38px] place-items-center rounded-full bg-accent text-accent-foreground">
            <Check aria-hidden="true" className="size-[18px] stroke-[2.8]" />
          </span>
          <div>
            <h1 className="text-[26px] font-extrabold leading-none tracking-[-0.04em]">
              Tasks<span className="text-faint">.</span>
            </h1>
            <p className="mt-[7px] font-mono text-[8.5px] font-bold uppercase tracking-[0.18em] text-faint">
              {summary.name} · {weekRangeLabel(monday)}
            </p>
          </div>
        </div>

        <dl className="flex items-center max-lg:order-3 max-lg:w-full max-lg:justify-between max-sm:grid max-sm:grid-cols-2 max-sm:gap-y-2">
          <TaskKpi label="restam" value={kpis.left} />
          <TaskKpi label="feitas" value={kpis.done} tone="text-status-done-ink" />
          <TaskKpi label="vencidas" value={kpis.overdue} tone="text-stale-ink" />
          <TaskKpi label="até domingo" value={kpis.due} tone="text-status-open-ink" />
        </dl>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 max-lg:w-full">
          <div className="inline-flex items-center rounded-full border border-line bg-surface p-[3px]">
            <button
              type="button"
              onClick={() => setMonday((current) => addDays(current, -7))}
              aria-label="Semana anterior"
              className="grid size-8 place-items-center rounded-full text-muted hover:bg-panel hover:text-foreground"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setMonday(startOfWeek(new Date()))}
              className="min-h-8 rounded-full px-3 text-[11px] font-bold text-muted hover:bg-panel hover:text-foreground"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setMonday((current) => addDays(current, 7))}
              aria-label="Próxima semana"
              className="grid size-8 place-items-center rounded-full text-muted hover:bg-panel hover:text-foreground"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setNewTaskDate(columns[0]?.scheduleDate ?? today)}
            className="inline-flex min-h-[38px] items-center gap-2 rounded-full bg-contrast px-4 text-[12.5px] font-bold text-contrast-foreground hover:bg-contrast-hover"
          >
            <Plus aria-hidden="true" className="size-4 opacity-60" />
            Nova tarefa
          </button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={(event: DragStartEvent) => {
          const taskId = event.active.data.current?.taskId as string | undefined;
          setDragging(tasks.find((task) => task.id === taskId) ?? null);
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <section aria-label="Agenda semanal" className="rounded-card bg-ink p-3 shadow-deck">
          <div className="bl-scroll grid auto-cols-[minmax(260px,84vw)] grid-flow-col items-start gap-2.5 overflow-x-auto pb-2 md:auto-cols-auto md:grid-flow-row md:grid-cols-3 md:overflow-visible md:pb-0 xl:grid-cols-6">
            {columns.map((column) => (
              <WeekDayColumn
                key={column.key}
                column={column}
                isToday={column.dates.includes(today)}
                tasks={scheduled.get(column.key) ?? []}
                projectById={projectById}
                columns={columns}
                onSchedule={updateSchedule}
                onToggleDone={(task) =>
                  mutations.update.mutate({
                    workspaceId,
                    taskId: task.id,
                    expectedVersion: task.version,
                    patch: { status: task.status === "done" ? "open" : "done" },
                  })
                }
                onOpen={(task) => setDetailsId(task.id)}
                onNew={() => setNewTaskDate(column.scheduleDate)}
              />
            ))}
          </div>
        </section>

        <div className="mt-3 grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
          <DeadlinePanel tasks={tasks} projectById={projectById} />
          <UnscheduledPanel
            tasks={unscheduled}
            projectById={projectById}
            columns={columns}
            onSchedule={updateSchedule}
            onOpen={(task) => setDetailsId(task.id)}
          />
        </div>

        {typeof document !== "undefined"
          ? createPortal(
              <DragOverlay dropAnimation={null}>
                {dragging ? (
                  <TaskGhost
                    task={dragging}
                    projectName={projectById.get(dragging.projectId) ?? "sem projeto"}
                  />
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </DndContext>

      <footer className="mt-3 flex flex-wrap justify-between gap-2 px-2.5 font-mono text-[10px] leading-6 text-faint">
        <p>Arraste entre os dias ou use o seletor no card. Toda mudança grava na hora.</p>
        <p>Dia na agenda e prazo são independentes.</p>
      </footer>

      <NewTaskDialog
        open={newTaskDate !== null}
        onClose={() => setNewTaskDate(null)}
        workspaceId={workspaceId}
        projects={projects}
        defaultProjectId={projects[0]?.id ?? ""}
        {...(newTaskDate ? { defaultScheduledDate: newTaskDate } : {})}
      />
      {detailsTask ? (
        <TaskDrawer
          workspaceId={workspaceId}
          task={detailsTask}
          onClose={() => setDetailsId(null)}
        />
      ) : null}
    </div>
  );
}

function TaskKpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="relative px-4 py-0.5 first:pl-0 max-sm:px-3 [&+&]:before:absolute [&+&]:before:bottom-[14%] [&+&]:before:left-0 [&+&]:before:top-[14%] [&+&]:before:w-px [&+&]:before:bg-line max-lg:[&+&]:before:hidden">
      <dt className="mb-[7px] whitespace-nowrap font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">
        {label}
      </dt>
      <dd className={`text-[21px] font-extrabold leading-none ${tone ?? "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}

function WeekDayColumn({
  column,
  isToday,
  tasks,
  projectById,
  columns,
  onSchedule,
  onToggleDone,
  onOpen,
  onNew,
}: {
  column: WeekColumn;
  isToday: boolean;
  tasks: BoardTask[];
  projectById: Map<string, string>;
  columns: readonly WeekColumn[];
  onSchedule: (task: BoardTask, date: string | null) => void;
  onToggleDone: (task: BoardTask) => void;
  onOpen: (task: BoardTask) => void;
  onNew: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day:${column.key}`,
    data: { scheduleDate: column.scheduleDate },
  });
  const dateLabel =
    column.dates.length === 1
      ? shortDay(column.scheduleDate)
      : `${shortDay(column.dates[0] ?? "")}–${shortDay(column.dates[1] ?? "")}`;

  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.label}, ${dateLabel}`}
      className={`min-h-[230px] rounded-panel p-2 transition-colors ${isOver ? "bg-ink-drop" : "bg-ink-2"}`}
    >
      <header
        className={`mb-2 flex min-h-8 items-center gap-2 rounded-full px-2.5 ${isToday ? "bg-accent text-accent-foreground" : "bg-ink-3 text-ink-muted"}`}
      >
        <span className="size-1.5 rounded-full bg-current opacity-60" />
        <h2 className="font-mono text-[9px] font-extrabold uppercase tracking-[0.12em]">
          {column.shortLabel}
        </h2>
        {isToday ? (
          <span className="rounded-full bg-accent-foreground px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase text-accent">
            hoje
          </span>
        ) : null}
        <span className="ml-auto font-mono text-[9px] font-bold opacity-70">{dateLabel}</span>
        <span className="rounded-full bg-ink-chip px-1.5 py-0.5 font-mono text-[8px] font-bold">
          {tasks.filter((task) => task.status === "done").length}/{tasks.length}
        </span>
      </header>

      <div className="space-y-2">
        {tasks.map((task) => (
          <AgendaTaskCard
            key={task.id}
            task={task}
            projectName={projectById.get(task.projectId) ?? "sem projeto"}
            columns={columns}
            onSchedule={onSchedule}
            onToggleDone={onToggleDone}
            onOpen={onOpen}
          />
        ))}
        {tasks.length === 0 ? (
          <button
            type="button"
            onClick={onNew}
            className="flex min-h-24 w-full items-center justify-center rounded-control border border-dashed border-ink-line px-3 text-center font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-ink-faint hover:border-line-strong hover:text-ink-muted"
          >
            + agendar tarefa
          </button>
        ) : null}
      </div>
    </section>
  );
}

function AgendaTaskCard({
  task,
  projectName,
  columns,
  onSchedule,
  onToggleDone,
  onOpen,
}: {
  task: BoardTask;
  projectName: string;
  columns: readonly WeekColumn[];
  onSchedule: (task: BoardTask, date: string | null) => void;
  onToggleDone: (task: BoardTask) => void;
  onOpen: (task: BoardTask) => void;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: `task:${task.id}`,
    data: { taskId: task.id },
  });
  const selectedColumn = columnForTask(task, columns);
  const overdue = task.status !== "done" && task.dueDate && daysFromToday(task.dueDate) < 0;

  return (
    <article
      ref={setNodeRef}
      className={`rounded-control border-l-2 bg-ink px-2.5 py-2 shadow-[inset_0_0_0_1px_var(--ink-line)] ${isDragging ? "opacity-30" : ""} ${task.status === "done" ? "border-l-status-done opacity-65" : "border-l-status-progress"}`}
    >
      <div className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={task.status === "done"}
          onChange={() => onToggleDone(task)}
          aria-label={`Marcar ${task.title} como ${task.status === "done" ? "não concluída" : "concluída"}`}
          className="size-4 shrink-0 accent-[var(--accent)]"
        />
        <OwnerAvatar owner={ownerOf(task)} />
        <span className="max-w-[90px] truncate rounded-full bg-ink-chip px-1.5 py-1 font-mono text-[7.5px] font-bold uppercase text-ink-muted">
          {projectName}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Arrastar ${task.title}`}
          className="ml-auto grid size-7 shrink-0 touch-none place-items-center rounded-full text-ink-faint hover:bg-ink-3 hover:text-ink-foreground"
        >
          <GripVertical aria-hidden="true" className="size-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => onOpen(task)}
        className={`mt-1.5 block w-full text-left text-[12px] font-semibold leading-[1.35] text-ink-foreground hover:underline ${task.status === "done" ? "line-through" : ""}`}
      >
        {task.title}
      </button>
      <div className="mt-2 flex items-center gap-1.5">
        <select
          aria-label={`Dia de ${task.title}`}
          value={selectedColumn?.scheduleDate ?? ""}
          onChange={(event) => onSchedule(task, event.target.value || null)}
          className="min-w-0 flex-1 rounded-full border border-ink-line bg-ink-3 px-2 py-1.5 font-mono text-[8px] font-bold text-ink-muted"
        >
          <option value="">Sem dia</option>
          {columns.map((column) => (
            <option key={column.key} value={column.scheduleDate}>
              {column.shortLabel} · {shortDay(column.scheduleDate)}
            </option>
          ))}
        </select>
        {task.dueDate ? (
          <span
            className={`whitespace-nowrap rounded-full px-2 py-1.5 font-mono text-[8px] font-bold ${overdue ? "bg-stale-bg text-stale-ink" : "bg-ink-3 text-ink-faint"}`}
          >
            {dueLabel(task.dueDate)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function UnscheduledPanel({
  tasks,
  projectById,
  columns,
  onSchedule,
  onOpen,
}: {
  tasks: BoardTask[];
  projectById: Map<string, string>;
  columns: readonly WeekColumn[];
  onSchedule: (task: BoardTask, date: string | null) => void;
  onOpen: (task: BoardTask) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "day:none", data: { scheduleDate: null } });
  return (
    <aside
      ref={setNodeRef}
      className={`rounded-card bg-surface p-4 shadow-card transition-colors ${isOver ? "ring-2 ring-accent" : ""}`}
    >
      <div className="flex items-center gap-2">
        <CalendarDays aria-hidden="true" className="size-4 text-faint" />
        <h2 className="text-sm font-extrabold">Para agendar</h2>
        <span className="ml-auto rounded-full bg-panel px-2 py-1 font-mono text-[9px] font-bold text-muted">
          {tasks.length}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-5 text-muted">
        Sem dia nesta semana. Inclui tarefas planejadas para outras semanas.
      </p>
      <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-control bg-panel p-2.5">
            <button
              type="button"
              onClick={() => onOpen(task)}
              className="line-clamp-2 w-full text-left text-[11.5px] font-semibold hover:underline"
            >
              {task.title}
            </button>
            <div className="mt-2 flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[8px] font-bold uppercase text-faint">
                {projectById.get(task.projectId) ?? "sem projeto"}
              </span>
              <select
                aria-label={`Agendar ${task.title}`}
                value=""
                onChange={(event) => onSchedule(task, event.target.value || null)}
                className="rounded-full border border-line bg-surface px-2 py-1.5 font-mono text-[8px] font-bold text-muted"
              >
                <option value="">Agendar…</option>
                {columns.map((column) => (
                  <option key={column.key} value={column.scheduleDate}>
                    {column.shortLabel} · {shortDay(column.scheduleDate)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {tasks.length === 0 ? (
          <p className="rounded-control border border-dashed border-line p-4 text-center text-xs text-muted">
            Tudo distribuído nesta semana.
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function DeadlinePanel({
  tasks,
  projectById,
}: {
  tasks: BoardTask[];
  projectById: Map<string, string>;
}) {
  const openWithDue = tasks
    .filter((task) => task.status !== "done" && task.dueDate)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const buckets = [
    [
      "Vencidas",
      openWithDue.filter((task) => daysFromToday(task.dueDate ?? "") < 0).length,
      "text-stale-ink",
    ],
    [
      "Hoje",
      openWithDue.filter((task) => daysFromToday(task.dueDate ?? "") === 0).length,
      "text-warn",
    ],
    [
      "Próximos 7 dias",
      openWithDue.filter((task) => {
        const days = daysFromToday(task.dueDate ?? "");
        return days > 0 && days <= 7;
      }).length,
      "text-status-open-ink",
    ],
    [
      "Depois disso",
      openWithDue.filter((task) => daysFromToday(task.dueDate ?? "") > 7).length,
      "text-status-done-ink",
    ],
  ] as const;

  return (
    <section className="rounded-card bg-surface p-5 shadow-card">
      <h2 className="text-base font-extrabold tracking-[-0.02em]">Prazos: o que vence quando</h2>
      <p className="mt-1 text-[11px] leading-5 text-muted">
        Só tarefas abertas com prazo. A agenda continua independente desta data.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {buckets.map(([label, value, tone]) => (
          <div key={label} className="rounded-panel bg-panel p-3.5">
            <p className={`text-xl font-extrabold ${tone}`}>{value}</p>
            <p className="mt-2 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-faint">
              {label}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-line-soft pt-3">
        <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.1em] text-faint">
          Vence primeiro
        </p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {openWithDue.slice(0, 6).map((task) => (
            <li
              key={task.id}
              className="flex min-w-0 items-center gap-2 rounded-control bg-panel px-3 py-2"
            >
              <span
                className={`shrink-0 font-mono text-[9px] font-bold ${daysFromToday(task.dueDate ?? "") < 0 ? "text-stale-ink" : "text-muted"}`}
              >
                {dueLabel(task.dueDate ?? "")}
              </span>
              <span className="min-w-0 truncate text-[11px] font-semibold">{task.title}</span>
              <span className="ml-auto max-w-20 truncate font-mono text-[7.5px] font-bold uppercase text-faint">
                {projectById.get(task.projectId)}
              </span>
            </li>
          ))}
          {openWithDue.length === 0 ? (
            <li className="text-xs text-muted">Nenhuma tarefa aberta tem prazo.</li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}

function TaskGhost({ task, projectName }: { task: BoardTask; projectName: string }) {
  return (
    <div className="w-[260px] rounded-control bg-ink px-3 py-2.5 shadow-hover ring-1 ring-ink-line">
      <p className="font-mono text-[8px] font-bold uppercase text-ink-faint">{projectName}</p>
      <p className="mt-1 line-clamp-2 text-[12px] font-semibold text-ink-foreground">
        {task.title}
      </p>
    </div>
  );
}
