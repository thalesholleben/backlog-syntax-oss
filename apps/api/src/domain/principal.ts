import type { SubjectTypeSchema, WorkspaceRoleSchema } from "@backlog-syntax/contracts";
import type { z } from "zod";

export interface Principal {
  subjectType: z.infer<typeof SubjectTypeSchema>;
  subjectId: string;
  role: z.infer<typeof WorkspaceRoleSchema>;
  scopes: readonly string[];
  workspaceId?: string | undefined;
  authentication?: "session" | "oauth" | "pat" | "test" | undefined;
}
