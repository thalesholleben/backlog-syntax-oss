"use client";

import { useI18n } from "@/lib/i18n/provider";
import { errorMessage } from "@/lib/i18n/errors";
import type { Translator } from "@/lib/i18n/translate";
import type { Task } from "@backlog-syntax/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useToast } from "@/components/ui/toast";
import { ApiError, newIdempotencyKey } from "@/lib/api/client";
import {
  archiveTask,
  type ClaimTaskInput,
  type CreateTaskInput,
  claimTask,
  createTask,
  type ExtendClaimInput,
  extendClaim,
  type HandoffTaskInput,
  handoffTask,
  listAllTasks,
  type ReleaseClaimInput,
  recordTaskEvent,
  releaseClaim,
  type UpdateTaskInput,
  updateTask,
} from "@/lib/api/tasks";

/** Undo window before a soft delete is actually sent to the API. */
const SOFT_DELETE_UNDO_MS = 5_000;

export function tasksQueryKey(workspaceId: string) {
  return ["tasks", workspaceId] as const;
}

/**
 * O quadro é do workspace inteiro, não de um projeto: o recorte por projeto é um
 * filtro da lateral. Uma consulta só evita que cada projeto tenha o próprio
 * cache e que os painéis de resumo discordem entre si.
 */
export function useTasks(workspaceId: string) {
  return useQuery({
    queryKey: tasksQueryKey(workspaceId),
    queryFn: ({ signal }) => listAllTasks(workspaceId, signal),
    enabled: Boolean(workspaceId),
  });
}

function conflictMessage(error: unknown, t: Translator): string {
  if (error instanceof ApiError && error.status === 409) {
    return t("Essa tarefa mudou desde a última leitura. Recarregando os dados atuais.");
  }
  if (error instanceof ApiError) return errorMessage(error, t);
  return t("Não foi possível concluir a ação agora.");
}

/**
 * Every mutation below invalidates the shared task list instead of trusting a blind retry, so a
 * stale-version conflict always resolves by refetching the real current state.
 */
export function useTaskMutations(workspaceId: string) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: tasksQueryKey(workspaceId) });
  }

  function onError(error: unknown) {
    notify("error", conflictMessage(error, t));
    invalidate();
  }

  const create = useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input, newIdempotencyKey()),
    onSuccess: invalidate,
    onError,
  });

  const update = useMutation({
    mutationFn: (input: UpdateTaskInput) => updateTask(input, newIdempotencyKey()),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKey(workspaceId) });
      const previous = queryClient.getQueryData<{ data: Task[] }>(tasksQueryKey(workspaceId));
      if (previous) {
        queryClient.setQueryData(tasksQueryKey(workspaceId), {
          ...previous,
          data: previous.data.map((task) =>
            task.id === input.taskId ? { ...task, ...input.patch } : task,
          ),
        });
      }
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(tasksQueryKey(workspaceId), context.previous);
      onError(error);
    },
    onSuccess: invalidate,
  });

  const claim = useMutation({
    mutationFn: (input: ClaimTaskInput) => claimTask(input, newIdempotencyKey()),
    onSuccess: invalidate,
    onError,
  });

  const extend = useMutation({
    mutationFn: (input: ExtendClaimInput) => extendClaim(input, newIdempotencyKey()),
    onSuccess: invalidate,
    onError,
  });

  const release = useMutation({
    mutationFn: (input: ReleaseClaimInput) => releaseClaim(input, newIdempotencyKey()),
    onSuccess: invalidate,
    onError,
  });

  const handoff = useMutation({
    mutationFn: (input: HandoffTaskInput) => handoffTask(input, newIdempotencyKey()),
    onSuccess: invalidate,
    onError,
  });

  const addEvent = useMutation({
    mutationFn: (input: {
      workspaceId: string;
      taskId: string;
      expectedVersion: number;
      eventType: "evidence" | "decision_request" | "decision" | "comment";
      content: string;
    }) => recordTaskEvent(input, newIdempotencyKey()),
    onSuccess: (_event, input) =>
      queryClient.invalidateQueries({ queryKey: ["task-events", input.taskId] }),
    onError,
  });

  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  /**
   * Optimistic soft delete with an undo window: the card disappears immediately, and the API
   * call only fires after SOFT_DELETE_UNDO_MS unless the toast's "Desfazer" action cancels it.
   */
  function softDelete(workspaceId: string, task: Task) {
    const previous = queryClient.getQueryData<{ data: Task[] }>(tasksQueryKey(workspaceId));
    queryClient.setQueryData(tasksQueryKey(workspaceId), (current: { data: Task[] } | undefined) =>
      current ? { ...current, data: current.data.filter((item) => item.id !== task.id) } : current,
    );

    const timer = setTimeout(() => {
      pendingDeletes.current.delete(task.id);
      archiveTask(workspaceId, task.id, task.version, newIdempotencyKey()).catch((error) => {
        if (previous) queryClient.setQueryData(tasksQueryKey(workspaceId), previous);
        onError(error);
      });
    }, SOFT_DELETE_UNDO_MS);
    pendingDeletes.current.set(task.id, timer);

    notify("success", t('Tarefa "{0}" será removida em 5 segundos.', { "0": task.title }), {
      durationMs: SOFT_DELETE_UNDO_MS,
      action: {
        label: t("Desfazer"),
        onClick: () => {
          const pending = pendingDeletes.current.get(task.id);
          if (pending) {
            clearTimeout(pending);
            pendingDeletes.current.delete(task.id);
          }
          if (previous) queryClient.setQueryData(tasksQueryKey(workspaceId), previous);
        },
      },
    });
  }

  return { create, update, claim, extend, release, handoff, addEvent, softDelete };
}
