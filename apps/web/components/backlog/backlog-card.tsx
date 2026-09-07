"use client";

import { useDraggable } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Trash2 } from "lucide-react";
import { OwnerAvatar } from "@/components/backlog/owner-avatar";
import { listTaskEvents } from "@/lib/api/tasks";
import type { BoardTask } from "@/lib/backlog/board-task";
import {
  COLUMNS,
  dateTimePt,
  type Owner,
  pluralDays,
  STALE_LIMIT_DAYS,
  shortDate,
} from "@/lib/backlog/view-model";
import type { TaskPriority, TaskStatus } from "@/lib/domain-types";
import { priorityLabel } from "@/lib/task-presentation";
import { daysFromToday } from "@/lib/tasks/week";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

const EVENT_LABEL: Record<string, string> = {
  evidence: "Evidência",
  decision_request: "Pediu decisão",
  decision: "Decisão",
  comment: "Comentário",
};

export interface BacklogCardProps {
  task: BoardTask;
  owner: Owner;
  days: number;
  projectName: string;
  workspaceId: string;
  open: boolean;
  onToggle: () => void;
  onChangeStatus: (status: TaskStatus) => void;
  onChangePriority: (priority: TaskPriority) => void;
  onChangeDueDate: (dueDate: string | null) => void;
  onOpenDetails: () => void;
  onDelete: () => void;
}

/**
 * Card sanfona: fechado mostra só o suficiente para decidir; aberto vira a ficha
 * inteira. Enquanto aberto ele para de ser arrastável, porque com `draggable`
 * ligado o navegador não deixa selecionar o texto, e é justamente ali que estão
 * a descrição e o motivo do bloqueio que a pessoa quer copiar.
 */
export function BacklogCard({
  task,
  owner,
  days,
  projectName,
  workspaceId,
  open,
  onToggle,
  onChangeStatus,
  onChangePriority,
  onChangeDueDate,
  onOpenDetails,
  onDelete,
}: BacklogCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task:${task.id}`,
    data: { taskId: task.id, status: task.status },
  });

  const events = useQuery({
    queryKey: ["task-events", task.id],
    queryFn: ({ signal }) => listTaskEvents(workspaceId, task.id, signal),
    enabled: open,
  });

  const done = task.status === "done";
  const overdue = !done && task.dueDate ? daysFromToday(task.dueDate) < 0 : false;
  const stale = overdue || (!done && !task.dueDate && days > STALE_LIMIT_DAYS);
  const badge = done
    ? `fechada ${shortDate(task.updatedAt)}`
    : task.dueDate
      ? `prazo ${shortDate(task.dueDate)}`
      : pluralDays(days);
  const claim = task.claimedBy;

  return (
    <article
      data-arrastando={isDragging || undefined}
      className="group relative overflow-hidden rounded-control border border-transparent bg-ink-2 transition-[background-color,border-color,opacity] hover:border-ink-line hover:bg-ink-hover data-[arrastando]:opacity-35 data-[aberto=true]:border-ink-line data-[aberto=true]:bg-ink-hover"
      data-aberto={open}
    >
      {/* O próprio cabeçalho é a alça de arrasto. Enquanto a ficha está aberta os
          listeners saem: com o arrasto ligado o navegador não deixa selecionar o
          texto de dentro, que é justamente o que a pessoa quer copiar. */}
      <button
        type="button"
        ref={setNodeRef}
        {...attributes}
        {...(open ? {} : listeners)}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`ficha-${task.id}`}
        aria-label={`Detalhes da tarefa ${task.title}`}
        className={`block w-full px-[9px] pb-[9px] pt-2 text-left focus-visible:rounded-control focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ink-focus)] ${
          open ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <div className="mb-[5px] flex items-center gap-1.5">
          <OwnerAvatar owner={owner} />
          <span className="font-mono text-[9.5px] font-bold tracking-[0.05em] text-ink-faint">
            #{task.id.slice(-4)}
          </span>
          <span
            title={`projeto ${projectName}`}
            className="max-w-[130px] truncate rounded-full bg-ink-chip px-[7px] py-1 font-mono text-[8.5px] font-bold uppercase leading-none tracking-[0.05em] text-ink-muted"
          >
            {projectName}
          </span>
          {claim ? (
            <span
              title="lease ativo"
              className="rounded-full bg-warn px-[7px] py-1 font-mono text-[8.5px] font-bold leading-none text-[#121212]"
            >
              lease
            </span>
          ) : null}
          <span
            className={`ml-auto whitespace-nowrap rounded-full px-2 py-1 font-mono text-[8.5px] font-bold leading-none ${
              stale
                ? "bg-stale-bg text-stale-ink shadow-[inset_0_0_0_1px_var(--stale-line)]"
                : "bg-ink-3 text-ink-muted"
            }`}
          >
            {badge}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-3 shrink-0 text-ink-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
        <p
          className={`font-semibold leading-[1.34] tracking-[-0.012em] text-ink-foreground ${
            open ? "text-[13px]" : "line-clamp-2 text-[12.2px]"
          }`}
        >
          {task.title}
        </p>
      </button>

      <div className="bl-collapse" data-aberto={open} inert={!open} id={`ficha-${task.id}`}>
        <div>
          <div className={`px-2.5 ${open ? "pb-2.5" : ""}`}>
            <div className="rounded-control bg-ink-sheet px-3 py-[11px] shadow-[inset_0_0_0_1px_var(--ink-line)]">
              <p className="whitespace-pre-line text-[11.6px] leading-[1.6] text-ink-muted">
                {task.description?.trim() || "Sem descrição."}
              </p>

              {task.blockedReason ? (
                <p className="mt-2.5 border-t border-ink-line pt-2.5 text-[11.6px] leading-[1.6] text-stale-ink">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.08em]">
                    Motivo
                  </span>
                  <br />
                  {task.blockedReason}
                </p>
              ) : null}

              <div className="mt-2.5 flex flex-wrap gap-x-3.5 border-t border-ink-line pt-[9px] font-mono text-[10px] font-semibold leading-[1.7] text-ink-faint">
                <span>
                  criada <em className="not-italic text-ink-muted">{shortDate(task.createdAt)}</em>
                </span>
                <span>
                  {done ? "concluída" : "parada há"}{" "}
                  <em className="not-italic text-ink-muted">
                    {done ? shortDate(task.updatedAt) : pluralDays(days)}
                  </em>
                </span>
                <span>
                  última mudança{" "}
                  <em className="not-italic text-ink-muted">{dateTimePt(task.updatedAt)}</em>
                </span>
                {task.dueDate ? (
                  <span>
                    prazo <em className="not-italic text-ink-muted">{shortDate(task.dueDate)}</em>
                  </span>
                ) : null}
                {claim ? (
                  <span>
                    lease até{" "}
                    <em className="not-italic text-ink-muted">
                      {dateTimePt(claim.leaseExpiresAt)}
                    </em>
                  </span>
                ) : null}
              </div>

              <div className="mt-2.5 flex items-center gap-2 border-t border-ink-line pt-[9px]">
                <label
                  htmlFor={`status-${task.id}`}
                  className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-ink-faint"
                >
                  Status
                </label>
                <select
                  id={`status-${task.id}`}
                  value={task.status}
                  onChange={(event) => onChangeStatus(event.target.value as TaskStatus)}
                  className="min-w-0 flex-1 cursor-pointer rounded-full border border-ink-line bg-ink-3 px-2.5 py-[7px] text-[11px] font-semibold leading-[1.2] text-ink-foreground"
                >
                  {COLUMNS.map((column) => (
                    <option key={column.key} value={column.key}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <label
                  htmlFor={`prio-${task.id}`}
                  className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-ink-faint"
                >
                  Prioridade
                </label>
                <select
                  id={`prio-${task.id}`}
                  value={task.priority}
                  onChange={(event) => onChangePriority(event.target.value as TaskPriority)}
                  className="min-w-0 flex-1 cursor-pointer rounded-full border border-ink-line bg-ink-3 px-2.5 py-[7px] text-[11px] font-semibold leading-[1.2] text-ink-foreground"
                >
                  {PRIORITIES.map((item) => (
                    <option key={item} value={item}>
                      {priorityLabel[item]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <label
                  htmlFor={`prazo-${task.id}`}
                  className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-ink-faint"
                >
                  Prazo
                </label>
                <input
                  id={`prazo-${task.id}`}
                  type="date"
                  value={task.dueDate ?? ""}
                  onChange={(event) => onChangeDueDate(event.target.value || null)}
                  className="min-w-0 flex-1 rounded-full border border-ink-line bg-ink-3 px-2.5 py-[7px] text-[11px] font-semibold leading-[1.2] text-ink-foreground"
                />
              </div>

              <div className="mt-2.5 border-t border-ink-line pt-[9px]">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                  Trilha de eventos
                </p>
                <ul className="mt-[7px] flex flex-col gap-1">
                  {events.isLoading ? (
                    <li className="font-mono text-[10px] leading-[1.45] text-ink-faint">
                      carregando…
                    </li>
                  ) : null}
                  {events.data?.length === 0 ? (
                    <li className="font-mono text-[10px] leading-[1.45] text-ink-faint">
                      nada registrado ainda
                    </li>
                  ) : null}
                  {events.data
                    ?.slice(-6)
                    .reverse()
                    .map((event) => (
                      <li
                        key={event.id}
                        className="font-mono text-[10px] leading-[1.45] text-ink-faint"
                      >
                        <b className="font-bold text-ink-muted">
                          {EVENT_LABEL[event.eventType] ?? event.eventType}
                        </b>{" "}
                        · {dateTimePt(event.createdAt)} · {event.content}
                      </li>
                    ))}
                </ul>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-ink-line pt-[9px]">
                <button
                  type="button"
                  onClick={onOpenDetails}
                  className="rounded-full border border-ink-line px-3 py-[7px] text-[11px] font-bold text-ink-muted hover:bg-ink-3 hover:text-ink-foreground"
                >
                  Ficha completa
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label={`Excluir a tarefa ${task.title}`}
                  title="Excluir"
                  className="grid size-[34px] place-items-center rounded-full border border-ink-line text-ink-faint hover:border-stale-line hover:bg-stale-bg hover:text-stale-ink"
                >
                  <Trash2 aria-hidden="true" className="size-[15px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
