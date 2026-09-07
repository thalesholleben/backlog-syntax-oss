import type {
  ClaimTaskInputSchema,
  CreateTaskInputSchema,
  ExtendClaimInputSchema,
  HandoffTaskInputSchema,
  ReleaseClaimInputSchema,
  Task,
  TaskClaim,
  TaskEvent,
  TaskListSchema,
  TaskStatusSchema,
  UpdateTaskInputSchema,
} from "@backlog-syntax/contracts";
import type { z } from "zod";
import { apiClient } from "@/lib/api/client";

export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
export type ClaimTaskInput = z.infer<typeof ClaimTaskInputSchema>;
export type ExtendClaimInput = z.infer<typeof ExtendClaimInputSchema>;
export type ReleaseClaimInput = z.infer<typeof ReleaseClaimInputSchema>;
export type HandoffTaskInput = z.infer<typeof HandoffTaskInputSchema>;
type TaskStatus = z.infer<typeof TaskStatusSchema>;
type TaskList = z.infer<typeof TaskListSchema>;

const TASK_PAGE_SIZE = 100;
const MAX_TASK_PAGES = 100;

/** Shared schemas model use cases. This adapter removes route-owned fields for REST. */

export function listTasks(
  workspaceId: string,
  options: { projectId?: string; status?: TaskStatus; cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
): Promise<TaskList> {
  const query = new URLSearchParams();
  if (options.projectId) query.set("projectId", options.projectId);
  if (options.status) query.set("status", options.status);
  if (options.cursor) query.set("cursor", options.cursor);
  if (options.limit) query.set("limit", String(options.limit));
  return apiClient.get<TaskList>(`/v1/workspaces/${workspaceId}/tasks?${query.toString()}`, signal);
}

/**
 * The board and weekly agenda show workspace-wide aggregates, so a partial page would make their
 * counters incorrect. Follow the opaque cursor until the API says the snapshot is complete.
 */
export async function listAllTasks(workspaceId: string, signal?: AbortSignal): Promise<TaskList> {
  const data: Task[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  for (let pageNumber = 1; pageNumber <= MAX_TASK_PAGES; pageNumber += 1) {
    const result = await listTasks(
      workspaceId,
      cursor ? { cursor, limit: TASK_PAGE_SIZE } : { limit: TASK_PAGE_SIZE },
      signal,
    );
    data.push(...result.data);

    if (!result.page.hasMore) {
      return { data, page: { nextCursor: null, hasMore: false } };
    }

    const nextCursor = result.page.nextCursor;
    if (!nextCursor || seenCursors.has(nextCursor)) {
      throw new Error("A API devolveu um cursor de tarefas inválido.");
    }

    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  throw new Error("A listagem de tarefas excedeu o limite seguro de páginas.");
}

export function getTask(workspaceId: string, taskId: string, signal?: AbortSignal): Promise<Task> {
  return apiClient.get<Task>(`/v1/workspaces/${workspaceId}/tasks/${taskId}`, signal);
}

export function createTask(input: CreateTaskInput, idempotencyKey: string): Promise<Task> {
  const { workspaceId, ...body } = input;
  return apiClient.post<Task>(`/v1/workspaces/${workspaceId}/tasks`, body, { idempotencyKey });
}

export function updateTask(input: UpdateTaskInput, idempotencyKey: string): Promise<Task> {
  return apiClient.patch<Task>(
    `/v1/workspaces/${input.workspaceId}/tasks/${input.taskId}`,
    input.patch,
    {
      ifMatchVersion: input.expectedVersion,
      idempotencyKey,
    },
  );
}

export function claimTask(input: ClaimTaskInput, idempotencyKey: string): Promise<TaskClaim> {
  return apiClient.post<TaskClaim>(
    `/v1/workspaces/${input.workspaceId}/tasks/${input.taskId}/claim`,
    { leaseSeconds: input.leaseSeconds },
    {
      ifMatchVersion: input.expectedVersion,
      idempotencyKey,
    },
  );
}

export function extendClaim(input: ExtendClaimInput, idempotencyKey: string): Promise<TaskClaim> {
  return apiClient.post<TaskClaim>(
    `/v1/workspaces/${input.workspaceId}/tasks/${input.taskId}/claim/extend`,
    { leaseSeconds: input.leaseSeconds },
    {
      ifMatchVersion: input.expectedVersion,
      idempotencyKey,
    },
  );
}

export function releaseClaim(input: ReleaseClaimInput, idempotencyKey: string): Promise<void> {
  return apiClient.post<void>(
    `/v1/workspaces/${input.workspaceId}/tasks/${input.taskId}/claim/release`,
    {},
    {
      ifMatchVersion: input.expectedVersion,
      idempotencyKey,
    },
  );
}

export function handoffTask(input: HandoffTaskInput, idempotencyKey: string): Promise<TaskClaim> {
  return apiClient.post<TaskClaim>(
    `/v1/workspaces/${input.workspaceId}/tasks/${input.taskId}/handoff`,
    {
      targetSubjectType: input.targetSubjectType,
      targetSubjectId: input.targetSubjectId,
      note: input.note,
    },
    {
      ifMatchVersion: input.expectedVersion,
      idempotencyKey,
    },
  );
}

/**
 * Soft delete (archive). `TaskSchema` already models `archivedAt`, but no route to set it is
 * documented in AGENTS.md yet; this follows the REST convention of the other task actions.
 */
export function archiveTask(
  workspaceId: string,
  taskId: string,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<void> {
  return apiClient.delete<void>(`/v1/workspaces/${workspaceId}/tasks/${taskId}`, {
    ifMatchVersion: expectedVersion,
    idempotencyKey,
  });
}

export function listTaskEvents(
  workspaceId: string,
  taskId: string,
  signal?: AbortSignal,
): Promise<TaskEvent[]> {
  return apiClient.get<TaskEvent[]>(`/v1/workspaces/${workspaceId}/tasks/${taskId}/events`, signal);
}

export function recordTaskEvent(
  input: {
    workspaceId: string;
    taskId: string;
    expectedVersion: number;
    eventType: TaskEvent["eventType"];
    content: string;
  },
  idempotencyKey: string,
): Promise<TaskEvent> {
  return apiClient.post<TaskEvent>(
    `/v1/workspaces/${input.workspaceId}/tasks/${input.taskId}/events`,
    { eventType: input.eventType, content: input.content },
    { ifMatchVersion: input.expectedVersion, idempotencyKey },
  );
}
