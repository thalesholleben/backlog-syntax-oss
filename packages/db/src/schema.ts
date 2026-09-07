import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const authSchema = pgSchema("auth");
export const domainSchema = pgSchema("domain");

export const subjectType = domainSchema.enum("subject_type", ["user", "service_account"]);
export const workspaceRole = domainSchema.enum("workspace_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);
export const taskStatus = domainSchema.enum("task_status", [
  "open",
  "in_progress",
  "blocked",
  "done",
]);
export const taskPriority = domainSchema.enum("task_priority", ["low", "medium", "high", "urgent"]);

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const users = authSchema.table(
  "users",
  {
    userId: uuid("user_id").notNull().default(sql`uuidv7()`),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.userId], name: "users_pkey" }),
    uniqueIndex("uq_users_email_live")
      .on(sql`lower(${table.email})`)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const identities = authSchema.table(
  "identities",
  {
    identityId: uuid("identity_id").notNull().default(sql`uuidv7()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    credentialHash: text("credential_hash"),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.identityId], name: "identities_pkey" }),
    uniqueIndex("uq_identities_provider_account_live")
      .on(table.provider, table.providerAccountId)
      .where(sql`${table.deletedAt} is null`),
    index("idx_identities_user").on(table.userId).where(sql`${table.deletedAt} is null`),
  ],
);

export const workspaces = domainSchema.table(
  "workspaces",
  {
    tenantId: uuid("tenant_id").notNull().default(sql`uuidv7()`),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.tenantId], name: "workspaces_pkey" }),
    uniqueIndex("uq_workspaces_slug_live").on(table.slug).where(sql`${table.deletedAt} is null`),
  ],
);

export const serviceAccounts = domainSchema.table(
  "service_accounts",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => workspaces.tenantId, { onDelete: "cascade" }),
    serviceAccountId: uuid("service_account_id").notNull().default(sql`uuidv7()`),
    name: text("name").notNull(),
    description: text("description"),
    createdByUserId: uuid("created_by_user_id").notNull(),
    ...auditColumns,
  },
  (table) => [
    primaryKey({
      columns: [table.tenantId, table.serviceAccountId],
      name: "service_accounts_pkey",
    }),
    uniqueIndex("uq_service_accounts_name_live")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const workspaceMemberships = domainSchema.table(
  "workspace_memberships",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => workspaces.tenantId, { onDelete: "cascade" }),
    subjectType: subjectType("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    role: workspaceRole("role").notNull(),
    ...auditColumns,
  },
  (table) => [
    primaryKey({
      columns: [table.tenantId, table.subjectType, table.subjectId],
      name: "workspace_memberships_pkey",
    }),
    index("idx_workspace_memberships_subject")
      .on(table.tenantId, table.subjectType, table.subjectId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const projects = domainSchema.table(
  "projects",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => workspaces.tenantId, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().default(sql`uuidv7()`),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.projectId], name: "projects_pkey" }),
    uniqueIndex("uq_projects_slug_live")
      .on(table.tenantId, table.slug)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const tasks = domainSchema.table(
  "tasks",
  {
    tenantId: uuid("tenant_id").notNull(),
    taskId: uuid("task_id").notNull().default(sql`uuidv7()`),
    projectId: uuid("project_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("open"),
    priority: taskPriority("priority").notNull().default("medium"),
    assigneeSubjectType: subjectType("assignee_subject_type"),
    assigneeSubjectId: uuid("assignee_subject_id"),
    blockedReason: text("blocked_reason"),
    scheduledDate: date("scheduled_date"),
    dueDate: date("due_date"),
    position: numeric("position", { precision: 20, scale: 6 }).notNull().default("1000"),
    version: integer("version").notNull().default(1),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.taskId], name: "tasks_pkey" }),
    foreignKey({
      columns: [table.tenantId, table.projectId],
      foreignColumns: [projects.tenantId, projects.projectId],
      name: "tasks_tenant_project_fkey",
    }).onDelete("cascade"),
    index("idx_tasks_project_status_position")
      .on(table.tenantId, table.projectId, table.status, table.position, table.taskId)
      .where(sql`${table.deletedAt} is null`),
    index("idx_tasks_assignee")
      .on(table.tenantId, table.assigneeSubjectType, table.assigneeSubjectId)
      .where(sql`${table.deletedAt} is null and ${table.assigneeSubjectId} is not null`),
    index("idx_tasks_scheduled_date")
      .on(table.tenantId, table.scheduledDate, table.taskId)
      .where(sql`${table.deletedAt} is null and ${table.archivedAt} is null`),
    check("tasks_version_positive", sql`${table.version} > 0`),
  ],
);

export const apiTokens = domainSchema.table(
  "api_tokens",
  {
    tenantId: uuid("tenant_id").notNull(),
    tokenId: uuid("token_id").notNull().default(sql`uuidv7()`),
    serviceAccountId: uuid("service_account_id").notNull(),
    name: text("name").notNull(),
    tokenPrefix: text("token_prefix").notNull(),
    secretHash: text("secret_hash").notNull(),
    scopes: text("scopes").array().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.tokenId], name: "api_tokens_pkey" }),
    foreignKey({
      columns: [table.tenantId, table.serviceAccountId],
      foreignColumns: [serviceAccounts.tenantId, serviceAccounts.serviceAccountId],
      name: "api_tokens_tenant_service_account_fkey",
    }).onDelete("cascade"),
    uniqueIndex("uq_api_tokens_prefix_live")
      .on(table.tokenPrefix)
      .where(sql`${table.deletedAt} is null`),
    index("idx_api_tokens_service_account")
      .on(table.tenantId, table.serviceAccountId)
      .where(sql`${table.deletedAt} is null`),
  ],
);
