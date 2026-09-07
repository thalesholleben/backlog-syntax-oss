import type {
  SubjectTypeSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
  WorkspaceRoleSchema,
} from "@backlog-syntax/contracts";
import type { z } from "zod";

export type SubjectType = z.infer<typeof SubjectTypeSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
