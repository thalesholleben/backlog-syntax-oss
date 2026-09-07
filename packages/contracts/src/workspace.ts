import { z } from "@hono/zod-openapi";
import { IdentifierSchema, IsoDateTimeSchema } from "./common.js";

export const WorkspaceRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);
export const SubjectTypeSchema = z.enum(["user", "service_account"]);

export const WorkspaceContextParamsSchema = z
  .object({ workspaceId: IdentifierSchema })
  .strict()
  .openapi("WorkspaceContextParams");

export const WorkspaceContextSchema = z
  .object({
    workspace: z
      .object({
        id: IdentifierSchema,
        name: z.string().min(1).max(120),
        slug: z.string().min(1).max(80),
      })
      .strict(),
    principal: z
      .object({
        subjectType: SubjectTypeSchema,
        subjectId: IdentifierSchema,
        role: WorkspaceRoleSchema,
      })
      .strict(),
    projects: z.array(
      z
        .object({
          id: IdentifierSchema,
          name: z.string().min(1).max(120),
          slug: z.string().min(1).max(80),
          updatedAt: IsoDateTimeSchema,
        })
        .strict(),
    ),
  })
  .strict()
  .openapi("WorkspaceContext");

export type WorkspaceContext = z.infer<typeof WorkspaceContextSchema>;
