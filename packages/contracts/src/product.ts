import { z } from "@hono/zod-openapi";
import {
  CursorPageSchema,
  CursorQuerySchema,
  IdentifierSchema,
  IsoDateTimeSchema,
} from "./common.js";
import { McpScopeSchema, ServiceAccountScopeSchema } from "./mcp.js";
import { TaskEventSchema, TaskSchema } from "./task.js";
import { WorkspaceRoleSchema } from "./workspace.js";

const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);

export const WorkspaceSchema = z
  .object({
    id: IdentifierSchema,
    name: z.string().min(1).max(120),
    slug: slugSchema,
    role: WorkspaceRoleSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .openapi("Workspace");

export const CreateWorkspaceInputSchema = z
  .object({ name: z.string().trim().min(1).max(120), slug: slugSchema })
  .strict();
export const UpdateWorkspaceInputSchema = CreateWorkspaceInputSchema.partial().strict();
export const WorkspaceListSchema = z
  .object({ data: z.array(WorkspaceSchema), page: CursorPageSchema })
  .strict()
  .openapi("WorkspaceList");

export const ProjectSchema = z
  .object({
    id: IdentifierSchema,
    workspaceId: IdentifierSchema,
    name: z.string().min(1).max(120),
    slug: slugSchema,
    description: z.string().max(10_000).nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .openapi("Project");

export const ProjectListQuerySchema = CursorQuerySchema;
export const ProjectListSchema = z
  .object({ data: z.array(ProjectSchema), page: CursorPageSchema })
  .strict()
  .openapi("ProjectList");
export const CreateProjectInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    slug: slugSchema,
    description: z.string().max(10_000).optional(),
  })
  .strict();
export const UpdateProjectInputSchema = CreateProjectInputSchema.partial().strict();

export const ServiceAccountSchema = z
  .object({
    id: IdentifierSchema,
    workspaceId: IdentifierSchema,
    name: z.string().min(1).max(120),
    description: z.string().max(2_000).nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strict()
  .openapi("ServiceAccount");
export const CreateServiceAccountInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(2_000).optional(),
  })
  .strict();
export const ServiceAccountListSchema = z.array(ServiceAccountSchema).openapi("ServiceAccountList");

export const ApiTokenSchema = z
  .object({
    id: IdentifierSchema,
    serviceAccountId: IdentifierSchema,
    name: z.string().min(1).max(120),
    prefix: z.string().min(8).max(64),
    scopes: z.array(ServiceAccountScopeSchema).min(1),
    expiresAt: IsoDateTimeSchema.nullable(),
    lastUsedAt: IsoDateTimeSchema.nullable(),
    revokedAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strict()
  .openapi("ApiToken");
export const CreateApiTokenInputSchema = z
  .object({
    serviceAccountId: IdentifierSchema,
    name: z.string().trim().min(1).max(120),
    scopes: z.array(ServiceAccountScopeSchema).min(1),
    expiresAt: IsoDateTimeSchema.optional(),
  })
  .strict();
export const CreatedApiTokenSchema = z
  .object({ token: z.string().min(32), metadata: ApiTokenSchema })
  .strict()
  .openapi("CreatedApiToken");
export const ApiTokenListSchema = z.array(ApiTokenSchema).openapi("ApiTokenList");

export const ExportSchema = z
  .object({
    exportedAt: IsoDateTimeSchema,
    workspace: WorkspaceSchema.omit({ role: true }),
    projects: z.array(ProjectSchema),
    tasks: z.array(TaskSchema),
    taskEvents: z.array(TaskEventSchema),
    serviceAccounts: z.array(ServiceAccountSchema),
    apiTokens: z.array(ApiTokenSchema),
  })
  .strict()
  .openapi("WorkspaceExport");
export const DeletionRequestSchema = z
  .object({
    id: IdentifierSchema,
    workspaceId: IdentifierSchema,
    status: z.enum(["pending", "cancelled", "completed"]),
    recoverableUntil: IsoDateTimeSchema,
    createdAt: IsoDateTimeSchema,
  })
  .strict()
  .openapi("DeletionRequest");

export const AccountExportSchema = z
  .object({
    exportedAt: IsoDateTimeSchema,
    account: z
      .object({
        id: IdentifierSchema,
        name: z.string(),
        email: z.email(),
        emailVerified: z.boolean(),
        createdAt: IsoDateTimeSchema,
        updatedAt: IsoDateTimeSchema,
        termsAcceptedAt: IsoDateTimeSchema.nullable(),
        privacyNoticeAcceptedAt: IsoDateTimeSchema.nullable(),
        legalNoticeVersion: z.string().nullable(),
      })
      .strict(),
    sessions: z.array(
      z
        .object({
          createdAt: IsoDateTimeSchema,
          updatedAt: IsoDateTimeSchema,
          expiresAt: IsoDateTimeSchema,
          ipAddress: z.string().nullable(),
          userAgent: z.string().nullable(),
        })
        .strict(),
    ),
    memberships: z.array(
      z
        .object({
          workspaceId: IdentifierSchema,
          workspaceName: z.string(),
          workspaceSlug: slugSchema,
          role: WorkspaceRoleSchema,
        })
        .strict(),
    ),
  })
  .strict()
  .openapi("AccountExport");

export const DeleteAccountInputSchema = z
  .object({
    confirmation: z.literal("excluir"),
    email: z.email(),
  })
  .strict()
  .openapi("DeleteAccountInput");

export const AccountDeletionReceiptSchema = z
  .object({
    receiptId: IdentifierSchema,
    deletedAt: IsoDateTimeSchema,
    membershipsRemoved: z.number().int().nonnegative(),
  })
  .strict()
  .openapi("AccountDeletionReceipt");

export const McpAuthorizationSchema = z
  .object({ subjectId: IdentifierSchema, scopes: z.array(McpScopeSchema) })
  .strict();

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ServiceAccount = z.infer<typeof ServiceAccountSchema>;
export type ApiToken = z.infer<typeof ApiTokenSchema>;
export type WorkspaceExport = z.infer<typeof ExportSchema>;
export type AccountExport = z.infer<typeof AccountExportSchema>;
export type AccountDeletionReceipt = z.infer<typeof AccountDeletionReceiptSchema>;
