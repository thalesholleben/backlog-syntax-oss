import { z } from "@hono/zod-openapi";
import {
  CursorPageSchema,
  CursorQuerySchema,
  IdentifierSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
} from "./common.js";
import { SubjectTypeSchema } from "./workspace.js";

export const TaskStatusSchema = z.enum(["open", "in_progress", "blocked", "done"]);
export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const ActiveTaskClaimSchema = z
  .object({
    subjectType: SubjectTypeSchema,
    subjectId: IdentifierSchema,
    leaseExpiresAt: IsoDateTimeSchema,
  })
  .strict()
  .openapi("ActiveTaskClaim");

export const TaskAuthorSchema = z
  .object({
    subjectType: SubjectTypeSchema,
    subjectId: IdentifierSchema,
  })
  .strict()
  .openapi("TaskAuthor");

export const TaskSchema = z
  .object({
    id: IdentifierSchema,
    workspaceId: IdentifierSchema,
    projectId: IdentifierSchema,
    title: z.string().min(1).max(200),
    description: z.string().max(50_000).nullable(),
    status: TaskStatusSchema,
    priority: TaskPrioritySchema,
    blockedReason: z.string().max(2_000).nullable(),
    scheduledDate: IsoDateSchema.nullable(),
    dueDate: IsoDateSchema.nullable(),
    position: z.string().regex(/^\d+(\.\d+)?$/),
    version: z.number().int().positive(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    archivedAt: IsoDateTimeSchema.nullable(),
    claimedBy: ActiveTaskClaimSchema.nullable(),
    createdBy: TaskAuthorSchema.nullable(),
  })
  .strict()
  .openapi("Task");

export const ListTasksInputSchema = CursorQuerySchema.extend({
  workspaceId: IdentifierSchema,
  projectId: IdentifierSchema.optional(),
  status: TaskStatusSchema.optional(),
}).strict();

export const TaskListSchema = z
  .object({
    data: z.array(TaskSchema),
    page: CursorPageSchema,
  })
  .strict()
  .openapi("TaskList");

export const GetTaskInputSchema = z
  .object({ workspaceId: IdentifierSchema, taskId: IdentifierSchema })
  .strict();

export const CreateTaskInputSchema = z
  .object({
    workspaceId: IdentifierSchema,
    projectId: IdentifierSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(50_000).optional(),
    priority: TaskPrioritySchema.default("medium"),
    scheduledDate: IsoDateSchema.optional(),
    dueDate: IsoDateSchema.optional(),
  })
  .strict();

export const UpdateTaskInputSchema = z
  .object({
    workspaceId: IdentifierSchema,
    taskId: IdentifierSchema,
    expectedVersion: z.number().int().positive(),
    patch: z
      .object({
        projectId: IdentifierSchema.optional(),
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().max(50_000).nullable().optional(),
        status: TaskStatusSchema.optional(),
        priority: TaskPrioritySchema.optional(),
        blockedReason: z.string().max(2_000).nullable().optional(),
        scheduledDate: IsoDateSchema.nullable().optional(),
        dueDate: IsoDateSchema.nullable().optional(),
        position: z
          .string()
          .regex(/^\d+(\.\d+)?$/)
          .optional(),
      })
      .strict(),
  })
  .strict();

export const TaskQueueInputSchema = z
  .object({
    workspaceId: IdentifierSchema,
    projectId: IdentifierSchema,
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const TaskQueueSchema = z
  .object({
    data: z.array(TaskSchema),
  })
  .strict()
  .openapi("TaskQueue");

const ClaimBaseSchema = z
  .object({
    workspaceId: IdentifierSchema,
    taskId: IdentifierSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const ClaimTaskInputSchema = ClaimBaseSchema.extend({
  leaseSeconds: z.number().int().min(60).max(86_400).default(1_800),
}).strict();

export const ExtendClaimInputSchema = ClaimBaseSchema.extend({
  leaseSeconds: z.number().int().min(60).max(86_400).default(1_800),
}).strict();

export const ReleaseClaimInputSchema = ClaimBaseSchema;

export const HandoffTaskInputSchema = ClaimBaseSchema.extend({
  targetSubjectType: SubjectTypeSchema,
  targetSubjectId: IdentifierSchema,
  note: z.string().trim().min(1).max(4_000),
}).strict();

export const TaskEventTypeSchema = z.enum(["evidence", "decision_request", "decision", "comment"]);

export const TaskClaimSchema = z
  .object({
    taskId: IdentifierSchema,
    subjectType: SubjectTypeSchema,
    subjectId: IdentifierSchema,
    claimedAt: IsoDateTimeSchema,
    heartbeatAt: IsoDateTimeSchema,
    leaseExpiresAt: IsoDateTimeSchema,
  })
  .strict()
  .openapi("TaskClaim");

export const TaskEventSchema = z
  .object({
    id: IdentifierSchema,
    taskId: IdentifierSchema,
    eventType: TaskEventTypeSchema,
    content: z.string().min(1).max(20_000),
    actorSubjectType: SubjectTypeSchema,
    actorSubjectId: IdentifierSchema,
    origin: z.enum(["rest", "mcp", "system"]),
    createdAt: IsoDateTimeSchema,
  })
  .strict()
  .openapi("TaskEvent");

export const TaskEventListSchema = z.array(TaskEventSchema).openapi("TaskEventList");

export const RecordTaskEventInputSchema = z
  .object({
    workspaceId: IdentifierSchema,
    taskId: IdentifierSchema,
    expectedVersion: z.number().int().positive().optional(),
    eventType: TaskEventTypeSchema,
    content: z.string().trim().min(1).max(20_000),
  })
  .strict();

export type Task = z.infer<typeof TaskSchema>;
export type TaskClaim = z.infer<typeof TaskClaimSchema>;
export type TaskEvent = z.infer<typeof TaskEventSchema>;
