"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PrincipalBadge } from "@/components/ui/principal-badge";
import { listTaskEvents } from "@/lib/api/tasks";
import type { BoardTask } from "@/lib/backlog/board-task";
import { useTaskMutations } from "@/lib/backlog/use-tasks";
import type { SubjectType, TaskPriority, TaskStatus } from "@/lib/domain-types";
import {
  priorityLabel,
  relativeAge,
  statusDotClass,
  statusLabel,
  TASK_STATUSES,
} from "@/lib/task-presentation";

const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

export function TaskDrawer({
  workspaceId,
  task,
  onClose,
}: {
  workspaceId: string;
  task: BoardTask;
  onClose: () => void;
}) {
  const mutations = useTaskMutations(workspaceId);
  const eventsQuery = useQuery({
    queryKey: ["task-events", task.id],
    queryFn: ({ signal }) => listTaskEvents(workspaceId, task.id, signal),
  });

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [scheduledDate, setScheduledDate] = useState(task.scheduledDate ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [comment, setComment] = useState("");
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffTargetType, setHandoffTargetType] = useState<SubjectType>("service_account");
  const [handoffTargetId, setHandoffTargetId] = useState("");
  const [handoffNote, setHandoffNote] = useState("");

  const dirty =
    title !== task.title ||
    description !== (task.description ?? "") ||
    scheduledDate !== (task.scheduledDate ?? "") ||
    dueDate !== (task.dueDate ?? "");

  function saveDetails() {
    mutations.update.mutate({
      workspaceId,
      taskId: task.id,
      expectedVersion: task.version,
      patch: {
        title,
        description: description || null,
        scheduledDate: scheduledDate || null,
        dueDate: dueDate || null,
      },
    });
  }

  function changeStatus(status: TaskStatus) {
    mutations.update.mutate({
      workspaceId,
      taskId: task.id,
      expectedVersion: task.version,
      patch: { status },
    });
  }

  function changePriority(priority: TaskPriority) {
    mutations.update.mutate({
      workspaceId,
      taskId: task.id,
      expectedVersion: task.version,
      patch: { priority },
    });
  }

  return (
    <Dialog open onClose={onClose} title={task.title} variant="drawer">
      <div className="space-y-8">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
            <span>#{task.id.slice(0, 8)}</span>
            <span aria-hidden="true">·</span>
            <span>versão {task.version}</span>
            <span aria-hidden="true">·</span>
            <span>atualizado há {relativeAge(task.updatedAt)}</span>
          </div>

          {task.claimedBy ? (
            <PrincipalBadge
              subjectType={task.claimedBy.subjectType}
              name={task.claimedBy.subjectId.slice(0, 8)}
            />
          ) : (
            <p className="text-sm text-muted">Sem responsável no momento.</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {!task.claimedBy ? (
              <Button
                size="sm"
                variant="secondary"
                isLoading={mutations.claim.isPending}
                onClick={() =>
                  mutations.claim.mutate({
                    workspaceId,
                    taskId: task.id,
                    expectedVersion: task.version,
                    leaseSeconds: 1800,
                  })
                }
              >
                Assumir tarefa
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                isLoading={mutations.release.isPending}
                onClick={() =>
                  mutations.release.mutate({
                    workspaceId,
                    taskId: task.id,
                    expectedVersion: task.version,
                  })
                }
              >
                Liberar claim
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setHandoffOpen((current) => !current)}>
              Fazer handoff
            </Button>
            <Button
              size="sm"
              variant="danger"
              className="ml-auto"
              onClick={() => {
                mutations.softDelete(workspaceId, task);
                onClose();
              }}
            >
              Excluir tarefa
            </Button>
          </div>

          {handoffOpen ? (
            <form
              className="space-y-3 rounded-2xl border border-line bg-panel p-4"
              onSubmit={(event) => {
                event.preventDefault();
                mutations.handoff.mutate(
                  {
                    workspaceId,
                    taskId: task.id,
                    expectedVersion: task.version,
                    targetSubjectType: handoffTargetType,
                    targetSubjectId: handoffTargetId,
                    note: handoffNote,
                  },
                  { onSuccess: () => setHandoffOpen(false) },
                );
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="radio"
                    name="handoff-type"
                    checked={handoffTargetType === "user"}
                    onChange={() => setHandoffTargetType("user")}
                  />
                  Pessoa
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="radio"
                    name="handoff-type"
                    checked={handoffTargetType === "service_account"}
                    onChange={() => setHandoffTargetType("service_account")}
                  />
                  Agente
                </label>
              </div>
              <Field label="ID do destinatário">
                {({ inputId }) => (
                  <Input
                    id={inputId}
                    required
                    value={handoffTargetId}
                    onChange={(event) => setHandoffTargetId(event.target.value)}
                  />
                )}
              </Field>
              <Field label="Nota do handoff">
                {({ inputId }) => (
                  <Input
                    id={inputId}
                    required
                    value={handoffNote}
                    onChange={(event) => setHandoffNote(event.target.value)}
                  />
                )}
              </Field>
              <Button type="submit" size="sm" isLoading={mutations.handoff.isPending}>
                Confirmar handoff
              </Button>
            </form>
          ) : null}
        </section>

        <section className="space-y-3">
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Estado</legend>
            <div className="flex flex-wrap gap-2">
              {TASK_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => changeStatus(status)}
                  aria-pressed={status === task.status}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold ${
                    status === task.status
                      ? "border-foreground bg-foreground text-background"
                      : "border-line text-muted hover:text-foreground"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-full ${statusDotClass[status]}`}
                  />
                  {statusLabel[status]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-bold">Prioridade</legend>
            <div className="flex flex-wrap gap-2">
              {priorities.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => changePriority(priority)}
                  aria-pressed={priority === task.priority}
                  className={`min-h-10 rounded-full border px-3 text-xs font-bold ${
                    priority === task.priority
                      ? "border-foreground bg-foreground text-background"
                      : "border-line text-muted hover:text-foreground"
                  }`}
                >
                  {priorityLabel[priority]}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dia na agenda">
              {({ inputId }) => (
                <Input
                  id={inputId}
                  type="date"
                  value={scheduledDate}
                  onChange={(event) => setScheduledDate(event.target.value)}
                />
              )}
            </Field>
            <Field label="Prazo">
              {({ inputId }) => (
                <Input
                  id={inputId}
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              )}
            </Field>
          </div>
          <Field label="Título">
            {({ inputId }) => (
              <Input
                id={inputId}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            )}
          </Field>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-description" className="text-sm font-bold">
              Descrição
            </label>
            <textarea
              id="task-description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-control border border-line bg-surface p-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent"
            />
          </div>
          {dirty ? (
            <Button size="sm" isLoading={mutations.update.isPending} onClick={saveDetails}>
              Salvar alterações
            </Button>
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold">Atividade e evidência</h3>
          <ul className="space-y-2">
            {eventsQuery.data?.map((item) => (
              <li key={item.id} className="rounded-2xl border border-line bg-panel p-3 text-sm">
                <div className="flex items-center justify-between gap-2 font-mono text-xs text-muted">
                  <span>{item.eventType}</span>
                  <span>{relativeAge(item.createdAt)}</span>
                </div>
                <p className="mt-1 leading-6">{item.content}</p>
              </li>
            ))}
            {eventsQuery.data?.length === 0 ? (
              <p className="text-sm text-muted">Sem eventos registrados ainda.</p>
            ) : null}
          </ul>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!comment.trim()) return;
              mutations.addEvent.mutate(
                {
                  workspaceId,
                  taskId: task.id,
                  expectedVersion: task.version,
                  eventType: "comment",
                  content: comment,
                },
                { onSuccess: () => setComment("") },
              );
            }}
          >
            <Input
              aria-label="Adicionar comentário"
              placeholder="Adicionar comentário…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              isLoading={mutations.addEvent.isPending}
            >
              Enviar
            </Button>
          </form>
        </section>
      </div>
    </Dialog>
  );
}
