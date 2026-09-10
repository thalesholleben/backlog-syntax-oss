import { createHash, randomBytes } from "node:crypto";
import type {
  ApiToken,
  Project,
  ServiceAccount,
  Task,
  TaskClaim,
  TaskEvent,
  Workspace,
  WorkspaceContext,
  WorkspaceExport,
} from "@backlog-syntax/contracts";
import { IdentifierSchema } from "@backlog-syntax/contracts";
import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { DomainError } from "../domain/errors.js";
import type { Principal } from "../domain/principal.js";

export interface CursorPage<T> {
  data: T[];
  page: { nextCursor: string | null; hasMore: boolean };
}

export interface MutationMetadata {
  idempotencyKey: string;
}

export interface CreateTaskData {
  projectId: string;
  title: string;
  description?: string | undefined;
  priority: Task["priority"];
  scheduledDate?: string | undefined;
  dueDate?: string | undefined;
}

export interface UpdateTaskData {
  projectId?: string | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  status?: Task["status"] | undefined;
  priority?: Task["priority"] | undefined;
  blockedReason?: string | null | undefined;
  scheduledDate?: string | null | undefined;
  dueDate?: string | null | undefined;
  position?: string | undefined;
}

export interface CreatedApiToken {
  token: string;
  metadata: ApiToken;
}

interface WorkspaceRow extends QueryResultRow {
  tenant_id: string;
  name: string;
  slug: string;
  role: Workspace["role"];
  created_at: Date;
  updated_at: Date;
}

interface ProjectRow extends QueryResultRow {
  project_id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

interface TaskRow extends QueryResultRow {
  task_id: string;
  tenant_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: Task["status"];
  priority: Task["priority"];
  blocked_reason: string | null;
  scheduled_date: string | Date | null;
  due_date: string | Date | null;
  position: string;
  version: number;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
  created_by_subject_type?: TaskClaim["subjectType"] | null;
  created_by_subject_id?: string | null;
  claim_subject_type?: TaskClaim["subjectType"] | null;
  claim_subject_id?: string | null;
  claim_lease_expires_at?: Date | null;
}

interface TaskClaimRow extends QueryResultRow {
  task_id: string;
  subject_type: TaskClaim["subjectType"];
  subject_id: string;
  claimed_at: Date;
  heartbeat_at: Date;
  lease_expires_at: Date;
}

interface TaskEventRow extends QueryResultRow {
  event_id: string;
  task_id: string;
  event_type: TaskEvent["eventType"];
  content: string;
  actor_subject_type: TaskEvent["actorSubjectType"];
  actor_subject_id: string;
  origin: TaskEvent["origin"];
  created_at: Date;
}

interface ServiceAccountRow extends QueryResultRow {
  service_account_id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_at: Date;
}

interface ApiTokenRow extends QueryResultRow {
  token_id: string;
  service_account_id: string;
  name: string;
  token_prefix: string;
  scopes: ApiToken["scopes"];
  expires_at: Date | null;
  last_used_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
}

interface IdempotencyRow extends QueryResultRow {
  request_hash: string;
  response_body: unknown;
}

function toIso(value: Date): string {
  return value.toISOString();
}

function toIsoDate(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function workspaceFromRow(row: WorkspaceRow): Workspace {
  return {
    id: row.tenant_id,
    name: row.name,
    slug: row.slug,
    role: row.role,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.project_id,
    workspaceId: row.tenant_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function taskFromRow(row: TaskRow): Task {
  return {
    id: row.task_id,
    workspaceId: row.tenant_id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    blockedReason: row.blocked_reason,
    scheduledDate: toIsoDate(row.scheduled_date),
    dueDate: toIsoDate(row.due_date),
    position: row.position,
    version: row.version,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    archivedAt: row.archived_at ? toIso(row.archived_at) : null,
    createdBy:
      row.created_by_subject_type && row.created_by_subject_id
        ? { subjectType: row.created_by_subject_type, subjectId: row.created_by_subject_id }
        : null,
    claimedBy:
      row.claim_subject_type && row.claim_subject_id && row.claim_lease_expires_at
        ? {
            subjectType: row.claim_subject_type,
            subjectId: row.claim_subject_id,
            leaseExpiresAt: toIso(row.claim_lease_expires_at),
          }
        : null,
  };
}

function claimFromRow(row: TaskClaimRow): TaskClaim {
  return {
    taskId: row.task_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    claimedAt: toIso(row.claimed_at),
    heartbeatAt: toIso(row.heartbeat_at),
    leaseExpiresAt: toIso(row.lease_expires_at),
  };
}

function eventFromRow(row: TaskEventRow): TaskEvent {
  return {
    id: row.event_id,
    taskId: row.task_id,
    eventType: row.event_type,
    content: row.content,
    actorSubjectType: row.actor_subject_type,
    actorSubjectId: row.actor_subject_id,
    origin: row.origin,
    createdAt: toIso(row.created_at),
  };
}

function serviceAccountFromRow(row: ServiceAccountRow): ServiceAccount {
  return {
    id: row.service_account_id,
    workspaceId: row.tenant_id,
    name: row.name,
    description: row.description,
    createdAt: toIso(row.created_at),
  };
}

function apiTokenFromRow(row: ApiTokenRow): ApiToken {
  return {
    id: row.token_id,
    serviceAccountId: row.service_account_id,
    name: row.name,
    prefix: row.token_prefix,
    scopes: row.scopes,
    expiresAt: row.expires_at ? toIso(row.expires_at) : null,
    lastUsedAt: row.last_used_at ? toIso(row.last_used_at) : null,
    revokedAt: row.revoked_at ? toIso(row.revoked_at) : null,
    createdAt: toIso(row.created_at),
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function requestHash(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(payload)))
    .digest("hex");
}

function hasPostgresCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function encodeCursor(id: string): string {
  return Buffer.from(JSON.stringify({ id }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined): string | null {
  if (!cursor) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null || !("id" in parsed)) throw new Error();
    return IdentifierSchema.parse(parsed.id);
  } catch {
    throw new DomainError("invalid_request", 422, "Invalid pagination cursor");
  }
}

function pageFromRows<T>(rows: T[], limit: number, id: (value: T) => string): CursorPage<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data.at(-1);
  return {
    data,
    page: { hasMore, nextCursor: hasMore && last ? encodeCursor(id(last)) : null },
  };
}

export class PostgresProductRepository {
  public constructor(private readonly pool: Pool) {}

  public findForPrincipal(
    workspaceId: string,
    principal: Principal,
  ): Promise<WorkspaceContext | null> {
    return this.getWorkspaceContext(workspaceId, principal);
  }

  private async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async setTenantContext(
    client: PoolClient,
    workspaceId: string,
    principal: Principal,
  ): Promise<Workspace["role"]> {
    if (principal.workspaceId && principal.workspaceId !== workspaceId) {
      throw new DomainError("not_found", 404, "Workspace not found");
    }
    let result: QueryResult<{ role: Workspace["role"] }>;
    try {
      result = await client.query<{ role: Workspace["role"] }>(
        `SELECT private.set_request_context($1::uuid, $2::domain.subject_type, $3::uuid) AS role`,
        [workspaceId, principal.subjectType, principal.subjectId],
      );
    } catch (error) {
      if (hasPostgresCode(error, "42501")) {
        throw new DomainError("not_found", 404, "Workspace not found");
      }
      throw error;
    }
    const row = result.rows[0];
    if (!row) throw new DomainError("not_found", 404, "Workspace not found");
    return row.role;
  }

  /**
   * Unico lugar que decide se um projeto aceita tarefa, e ele trava a linha.
   *
   * A chave estrangeira nao serve: exclusao aqui e logica, entao a linha do projeto
   * continua existindo depois de apagada e a FK aceita feliz. E conferir sem travar so
   * moveria o defeito para a janela entre a conferencia e a escrita: `deleteProject` toma
   * `FOR UPDATE` na mesma linha, entao um create ou move concorrente espera a exclusao
   * terminar e entao encontra a linha ja apagada, em vez de escapar por corrida.
   */
  private async lockLiveProject(
    client: PoolClient,
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const result = await client.query(
      `SELECT 1 FROM domain.projects
       WHERE tenant_id = $1::uuid AND project_id = $2::uuid AND deleted_at IS NULL
       FOR SHARE`,
      [workspaceId, projectId],
    );
    if (result.rowCount !== 1) throw new DomainError("not_found", 404, "Project not found");
  }

  private assertManager(role: Workspace["role"], principal: Principal): void {
    if (principal.subjectType !== "user" || (role !== "owner" && role !== "admin")) {
      throw new DomainError("forbidden", 403, "Workspace manager access is required");
    }
  }

  private assertWriter(role: Workspace["role"], principal: Principal): void {
    if (principal.subjectType === "user" && role === "viewer") {
      throw new DomainError("forbidden", 403, "Workspace write access is required");
    }
  }

  private async idempotent<T>(
    client: PoolClient,
    workspaceId: string,
    principal: Principal,
    operation: string,
    metadata: MutationMetadata,
    payload: unknown,
    responseStatus: number,
    execute: () => Promise<T>,
  ): Promise<T> {
    const hash = requestHash(payload);
    const lockKey = `${workspaceId}:${principal.subjectType}:${principal.subjectId}:${operation}:${metadata.idempotencyKey}`;
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [lockKey]);

    const replay = await client.query<IdempotencyRow>(
      `SELECT request_hash, response_body
       FROM domain.idempotency_keys
       WHERE tenant_id = $1::uuid
         AND subject_type = $2::domain.subject_type
         AND subject_id = $3::uuid
         AND operation = $4
         AND idempotency_key = $5
         AND expires_at > now()
         AND deleted_at IS NULL`,
      [workspaceId, principal.subjectType, principal.subjectId, operation, metadata.idempotencyKey],
    );
    const replayRow = replay.rows[0];
    if (replayRow) {
      if (replayRow.request_hash !== hash) {
        throw new DomainError("conflict", 409, "Idempotency key was reused with another payload");
      }
      return replayRow.response_body as T;
    }

    const result = await execute();
    await client.query(
      `INSERT INTO domain.idempotency_keys (
         tenant_id, idempotency_key, subject_type, subject_id, operation,
         request_hash, response_status, response_body, expires_at
       ) VALUES ($1::uuid, $2, $3::domain.subject_type, $4::uuid, $5, $6, $7, $8::jsonb,
                 now() + interval '24 hours')`,
      [
        workspaceId,
        metadata.idempotencyKey,
        principal.subjectType,
        principal.subjectId,
        operation,
        hash,
        responseStatus,
        JSON.stringify(result),
      ],
    );
    return result;
  }

  private async currentTaskVersion(
    client: PoolClient,
    workspaceId: string,
    taskId: string,
  ): Promise<number> {
    const current = await client.query<{ version: number }>(
      `SELECT version FROM domain.tasks
       WHERE tenant_id = $1::uuid AND task_id = $2::uuid
         AND archived_at IS NULL AND deleted_at IS NULL`,
      [workspaceId, taskId],
    );
    const row = current.rows[0];
    if (!row) throw new DomainError("not_found", 404, "Task not found");
    return row.version;
  }

  private async bumpTaskVersion(
    client: PoolClient,
    workspaceId: string,
    taskId: string,
    expectedVersion: number,
  ): Promise<void> {
    const result = await client.query(
      `UPDATE domain.tasks
       SET version = version + 1
       WHERE tenant_id = $1::uuid AND task_id = $2::uuid
         AND version = $3 AND archived_at IS NULL AND deleted_at IS NULL`,
      [workspaceId, taskId, expectedVersion],
    );
    if (result.rowCount === 1) return;
    const currentVersion = await this.currentTaskVersion(client, workspaceId, taskId);
    throw new DomainError(
      "stale_version",
      409,
      `Task version is stale; current version is ${currentVersion}`,
    );
  }

  public async listWorkspaces(
    principal: Principal,
    input: { cursor?: string | undefined; limit: number },
  ): Promise<CursorPage<Workspace>> {
    const after = decodeCursor(input.cursor);
    return this.transaction(async (client) => {
      await client.query(
        `SELECT set_config('app.subject_type', $1, true), set_config('app.subject_id', $2, true)`,
        [principal.subjectType, principal.subjectId],
      );
      const result = await client.query<WorkspaceRow>(
        `SELECT tenant_id, name, slug, role, created_at, updated_at
         FROM private.list_subject_workspaces(
           $1::domain.subject_type, $2::uuid, $3::uuid, $4::integer
         )`,
        [principal.subjectType, principal.subjectId, after, input.limit + 1],
      );
      return pageFromRows(result.rows.map(workspaceFromRow), input.limit, (item) => item.id);
    });
  }

  public async createWorkspace(
    principal: Principal,
    input: { name: string; slug: string },
  ): Promise<Workspace> {
    if (principal.subjectType !== "user") {
      throw new DomainError("forbidden", 403, "Only users can create workspaces");
    }
    return this.transaction(async (client) => {
      let created: QueryResult<{ tenant_id: string }>;
      try {
        created = await client.query<{ tenant_id: string }>(
          "SELECT private.create_workspace($1::uuid, $2, $3) AS tenant_id",
          [principal.subjectId, input.name, input.slug],
        );
      } catch (error) {
        // O indice de slug e parcial: so colide com workspace vivo. Sem este mapeamento a
        // violacao sobe crua e o cliente recebe 500 para um erro que e dele, nao nosso.
        if (hasPostgresCode(error, "23505")) {
          throw new DomainError("conflict", 409, "A workspace already uses this slug");
        }
        throw error;
      }
      const tenantId = created.rows[0]?.tenant_id;
      if (!tenantId) throw new DomainError("internal_error", 500, "Workspace was not created");
      await this.setTenantContext(client, tenantId, principal);
      const result = await client.query<WorkspaceRow>(
        `SELECT tenant_id, name, slug, 'owner'::domain.workspace_role AS role,
           created_at, updated_at FROM domain.workspaces WHERE tenant_id = $1::uuid`,
        [tenantId],
      );
      const row = result.rows[0];
      if (!row) throw new DomainError("internal_error", 500, "Workspace was not created");
      return workspaceFromRow(row);
    });
  }

  public async updateWorkspace(
    workspaceId: string,
    principal: Principal,
    input: { name?: string | undefined; slug?: string | undefined },
  ): Promise<Workspace> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertManager(role, principal);
      if (input.name === undefined && input.slug === undefined) {
        throw new DomainError("invalid_request", 422, "Workspace patch cannot be empty");
      }
      const result = await client.query<WorkspaceRow>(
        `UPDATE domain.workspaces SET name = COALESCE($2, name), slug = COALESCE($3, slug)
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL
         RETURNING tenant_id, name, slug, $4::domain.workspace_role AS role, created_at, updated_at`,
        [workspaceId, input.name ?? null, input.slug ?? null, role],
      );
      const row = result.rows[0];
      if (!row) throw new DomainError("not_found", 404, "Workspace not found");
      return workspaceFromRow(row);
    });
  }

  public async deleteWorkspace(workspaceId: string, principal: Principal): Promise<void> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      if (principal.subjectType !== "user" || role !== "owner") {
        throw new DomainError("forbidden", 403, "Workspace owner access is required");
      }
      const result = await client.query(
        "UPDATE domain.workspaces SET deleted_at = now() WHERE tenant_id = $1::uuid AND deleted_at IS NULL",
        [workspaceId],
      );
      if (result.rowCount !== 1) throw new DomainError("not_found", 404, "Workspace not found");
    });
  }

  public async getWorkspaceContext(
    workspaceId: string,
    principal: Principal,
  ): Promise<WorkspaceContext | null> {
    return this.transaction(async (client) => {
      let role: Workspace["role"];
      try {
        role = await this.setTenantContext(client, workspaceId, principal);
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "42501") return null;
        throw error;
      }

      const workspaceResult = await client.query<WorkspaceRow>(
        `SELECT tenant_id, name, slug, $2::domain.workspace_role AS role, created_at, updated_at
         FROM domain.workspaces
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL`,
        [workspaceId, role],
      );
      const workspace = workspaceResult.rows[0];
      if (!workspace) return null;

      const projects = await client.query<ProjectRow>(
        `SELECT project_id, tenant_id, name, slug, description, created_at, updated_at
         FROM domain.projects
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL
         ORDER BY project_id`,
        [workspaceId],
      );

      return {
        workspace: { id: workspace.tenant_id, name: workspace.name, slug: workspace.slug },
        principal: {
          subjectType: principal.subjectType,
          subjectId: principal.subjectId,
          role,
        },
        projects: projects.rows.map((project) => ({
          id: project.project_id,
          name: project.name,
          slug: project.slug,
          updatedAt: toIso(project.updated_at),
        })),
      };
    });
  }

  public async exportWorkspace(
    workspaceId: string,
    principal: Principal,
  ): Promise<WorkspaceExport> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertManager(role, principal);
      const workspaceResult = await client.query<WorkspaceRow>(
        `SELECT tenant_id, name, slug, $2::domain.workspace_role AS role,
           created_at, updated_at
         FROM domain.workspaces
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL`,
        [workspaceId, role],
      );
      const workspaceRow = workspaceResult.rows[0];
      if (!workspaceRow) throw new DomainError("not_found", 404, "Workspace not found");

      const projectsResult = await client.query<ProjectRow>(
        `SELECT project_id, tenant_id, name, slug, description, created_at, updated_at
         FROM domain.projects
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL
         ORDER BY project_id`,
        [workspaceId],
      );
      const tasksResult = await client.query<TaskRow>(
        `SELECT task.task_id, task.tenant_id, task.project_id, task.title, task.description,
           task.status, task.priority, task.blocked_reason, task.scheduled_date, task.due_date,
           task.position, task.version,
           task.created_at, task.updated_at, task.archived_at,
           task.created_by_subject_type, task.created_by_subject_id,
           claim.subject_type AS claim_subject_type,
           claim.subject_id AS claim_subject_id,
           claim.lease_expires_at AS claim_lease_expires_at
         FROM domain.tasks AS task
         LEFT JOIN domain.task_claims AS claim
           ON claim.tenant_id = task.tenant_id AND claim.task_id = task.task_id
          AND claim.released_at IS NULL AND claim.deleted_at IS NULL
          AND claim.lease_expires_at > now()
         WHERE task.tenant_id = $1::uuid AND task.deleted_at IS NULL
         ORDER BY task.task_id`,
        [workspaceId],
      );
      const eventsResult = await client.query<TaskEventRow>(
        `SELECT event_id, task_id, event_type, content, actor_subject_type,
           actor_subject_id, origin, created_at
         FROM domain.task_events
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL
         ORDER BY created_at, event_id`,
        [workspaceId],
      );
      const serviceAccountsResult = await client.query<ServiceAccountRow>(
        `SELECT service_account_id, tenant_id, name, description, created_at
         FROM domain.service_accounts
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL
         ORDER BY service_account_id`,
        [workspaceId],
      );
      const tokensResult = await client.query<ApiTokenRow>(
        `SELECT token_id, service_account_id, name, token_prefix, scopes,
           expires_at, last_used_at, revoked_at, created_at
         FROM domain.api_tokens
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL
         ORDER BY token_id`,
        [workspaceId],
      );
      const workspace = workspaceFromRow(workspaceRow);
      return {
        exportedAt: new Date().toISOString(),
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
        },
        projects: projectsResult.rows.map(projectFromRow),
        tasks: tasksResult.rows.map(taskFromRow),
        taskEvents: eventsResult.rows.map(eventFromRow),
        serviceAccounts: serviceAccountsResult.rows.map(serviceAccountFromRow),
        apiTokens: tokensResult.rows.map(apiTokenFromRow),
      };
    });
  }

  public async listProjects(
    workspaceId: string,
    principal: Principal,
    input: { cursor?: string | undefined; limit: number },
  ): Promise<CursorPage<Project>> {
    const after = decodeCursor(input.cursor);
    return this.transaction(async (client) => {
      await this.setTenantContext(client, workspaceId, principal);
      const result = await client.query<ProjectRow>(
        `SELECT project_id, tenant_id, name, slug, description, created_at, updated_at
         FROM domain.projects
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL
           AND ($2::uuid IS NULL OR project_id > $2::uuid)
         ORDER BY project_id
         LIMIT $3::integer`,
        [workspaceId, after, input.limit + 1],
      );
      return pageFromRows(result.rows.map(projectFromRow), input.limit, (item) => item.id);
    });
  }

  public async getProject(
    workspaceId: string,
    projectId: string,
    principal: Principal,
  ): Promise<Project | null> {
    return this.transaction(async (client) => {
      await this.setTenantContext(client, workspaceId, principal);
      const result = await client.query<ProjectRow>(
        `SELECT project_id, tenant_id, name, slug, description, created_at, updated_at
         FROM domain.projects WHERE tenant_id = $1::uuid AND project_id = $2::uuid
           AND deleted_at IS NULL`,
        [workspaceId, projectId],
      );
      return result.rows[0] ? projectFromRow(result.rows[0]) : null;
    });
  }

  public async createProject(
    workspaceId: string,
    principal: Principal,
    input: { name: string; slug: string; description?: string | undefined },
    metadata: MutationMetadata,
  ): Promise<Project> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertManager(role, principal);
      return this.idempotent(
        client,
        workspaceId,
        principal,
        "create_project",
        metadata,
        input,
        201,
        async () => {
          try {
            const result = await client.query<ProjectRow>(
              `INSERT INTO domain.projects (tenant_id, name, slug, description)
           VALUES ($1::uuid, $2, $3, $4)
           RETURNING project_id, tenant_id, name, slug, description, created_at, updated_at`,
              [workspaceId, input.name, input.slug, input.description ?? null],
            );
            const row = result.rows[0];
            if (!row) throw new DomainError("internal_error", 500, "Project was not created");
            return projectFromRow(row);
          } catch (error) {
            // `uq_projects_slug_live` e parcial, entao o slug de um projeto excluido
            // continua livre. So o vivo conflita.
            if (hasPostgresCode(error, "23505")) {
              throw new DomainError("conflict", 409, "A project already uses this slug");
            }
            throw error;
          }
        },
      );
    });
  }

  public async updateProject(
    workspaceId: string,
    projectId: string,
    principal: Principal,
    input: {
      name?: string | undefined;
      slug?: string | undefined;
      description?: string | null | undefined;
    },
    metadata: MutationMetadata,
  ): Promise<Project> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertManager(role, principal);
      return this.idempotent(
        client,
        workspaceId,
        principal,
        "update_project",
        metadata,
        { projectId, input },
        200,
        async () => {
          if (Object.keys(input).length === 0)
            throw new DomainError("invalid_request", 422, "Project patch cannot be empty");
          const result = await client.query<ProjectRow>(
            `UPDATE domain.projects SET name = COALESCE($3, name), slug = COALESCE($4, slug),
             description = CASE WHEN $5::boolean THEN $6 ELSE description END
           WHERE tenant_id = $1::uuid AND project_id = $2::uuid AND deleted_at IS NULL
           RETURNING project_id, tenant_id, name, slug, description, created_at, updated_at`,
            [
              workspaceId,
              projectId,
              input.name ?? null,
              input.slug ?? null,
              "description" in input,
              input.description ?? null,
            ],
          );
          const row = result.rows[0];
          if (!row) throw new DomainError("not_found", 404, "Project not found");
          return projectFromRow(row);
        },
      );
    });
  }

  public async deleteProject(
    workspaceId: string,
    projectId: string,
    principal: Principal,
    metadata: MutationMetadata,
    options: { withTasks: boolean } = { withTasks: false },
  ): Promise<void> {
    await this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertManager(role, principal);
      await this.idempotent(
        client,
        workspaceId,
        principal,
        "delete_project",
        metadata,
        // `withTasks` entra na assinatura da requisicao de proposito: a mesma chave de
        // idempotencia com intencao diferente e outra requisicao, nao uma repeticao.
        { projectId, withTasks: options.withTasks },
        204,
        async () => {
          /* Trava a linha antes de contar. Sem isso, uma tarefa criada entre a contagem e a
             exclusao sobreviveria apontando para um projeto morto. */
          const target = await client.query(
            `SELECT 1 FROM domain.projects
             WHERE tenant_id = $1::uuid AND project_id = $2::uuid AND deleted_at IS NULL
             FOR UPDATE`,
            [workspaceId, projectId],
          );
          if (target.rowCount !== 1) throw new DomainError("not_found", 404, "Project not found");
          const live = await client.query<{ count: string }>(
            `SELECT count(*)::text AS count
             FROM domain.tasks
             WHERE tenant_id = $1::uuid AND project_id = $2::uuid AND deleted_at IS NULL`,
            [workspaceId, projectId],
          );
          const tasks = Number(live.rows[0]?.count ?? "0");
          /* Apagar um projeto nunca apaga tarefa por tabela: quem quiser levar as tarefas
             junto precisa dizer isso na requisicao. Sem essa trava, um cliente que so
             queria limpar a lateral apagaria trabalho sem ser perguntado. */
          if (tasks > 0 && !options.withTasks) {
            throw new DomainError(
              "conflict",
              409,
              `Project still holds ${tasks} task(s); repeat with withTasks to delete them too`,
            );
          }
          if (tasks > 0) {
            await client.query(
              `UPDATE domain.tasks SET deleted_at = now()
               WHERE tenant_id = $1::uuid AND project_id = $2::uuid AND deleted_at IS NULL`,
              [workspaceId, projectId],
            );
          }
          const result = await client.query(
            "UPDATE domain.projects SET deleted_at = now() WHERE tenant_id = $1::uuid AND project_id = $2::uuid AND deleted_at IS NULL",
            [workspaceId, projectId],
          );
          if (result.rowCount !== 1) throw new DomainError("not_found", 404, "Project not found");
          return { deleted: true, tasks };
        },
      );
    });
  }

  /**
   * Fila de execucao: o estado presente, nao uma janela de tempo.
   *
   * Um marco temporal perde a tarefa cuja transacao comita depois do poll, porque o
   * marco ja avancou alem do timestamp gravado e aquela linha nunca mais volta. Aqui
   * nao ha marco, entao uma transacao que comita tarde simplesmente aparece no poll
   * seguinte. O claim e que tira a tarefa da fila, e um lease expirado a devolve, que
   * e o comportamento correto para trabalho abandonado.
   *
   * O predicado casa com idx_tasks_project_status_position, que ja existe.
   */
  public async listTaskQueue(
    workspaceId: string,
    principal: Principal,
    input: { projectId: string; limit: number },
  ): Promise<Task[]> {
    return this.transaction(async (client) => {
      await this.setTenantContext(client, workspaceId, principal);
      const result = await client.query<TaskRow>(
        `SELECT task.task_id, task.tenant_id, task.project_id, task.title, task.description,
                task.status, task.priority, task.blocked_reason, task.scheduled_date, task.due_date,
                task.position, task.version,
                task.created_at, task.updated_at, task.archived_at,
                task.created_by_subject_type, task.created_by_subject_id,
                NULL::domain.subject_type AS claim_subject_type,
                NULL::uuid AS claim_subject_id,
                NULL::timestamptz AS claim_lease_expires_at
         FROM domain.tasks AS task
         WHERE task.tenant_id = $1::uuid AND task.project_id = $2::uuid
           AND task.status = 'open'
           AND task.archived_at IS NULL AND task.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM domain.task_claims AS claim
             WHERE claim.tenant_id = task.tenant_id AND claim.task_id = task.task_id
               AND claim.released_at IS NULL AND claim.deleted_at IS NULL
               AND claim.lease_expires_at > now()
           )
         ORDER BY task.position, task.task_id
         LIMIT $3::integer`,
        [workspaceId, input.projectId, input.limit],
      );
      return result.rows.map(taskFromRow);
    });
  }

  /**
   * Balde de janela fixa por principal, decidido numa unica instrucao atomica.
   *
   * O caminho negado tambem precisa do inicio da janela, senao nao ha como calcular
   * Retry-After, entao o RETURNING devolve a janela nos dois casos. Vive no Postgres
   * porque memoria de processo concede um orcamento por replica e faria o limite
   * anunciado no contrato deixar de valer assim que a API escalasse.
   */
  public async consumeRateLimit(
    workspaceId: string,
    principal: Principal,
    bucket: string,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    return this.transaction(async (client) => {
      await this.setTenantContext(client, workspaceId, principal);
      const result = await client.query<{ allowed: boolean; retry_after_seconds: number }>(
        `INSERT INTO domain.rate_limits AS bucket_row
           (tenant_id, subject_type, subject_id, bucket, window_started_at)
         VALUES ($1::uuid, $2::domain.subject_type, $3::uuid, $4, now())
         ON CONFLICT (tenant_id, subject_type, subject_id, bucket) DO UPDATE
           SET window_started_at = CASE
                 WHEN bucket_row.window_started_at <= now() - ($5::integer * interval '1 second')
                   THEN now()
                 ELSE bucket_row.window_started_at
               END
         RETURNING
           bucket_row.window_started_at = now() AS allowed,
           GREATEST(
             0,
             ceil(
               extract(
                 epoch FROM (
                   bucket_row.window_started_at + ($5::integer * interval '1 second') - now()
                 )
               )
             )
           )::integer AS retry_after_seconds`,
        [workspaceId, principal.subjectType, principal.subjectId, bucket, windowSeconds],
      );
      const row = result.rows[0];
      if (!row) throw new DomainError("internal_error", 500, "Rate limit was not evaluated");
      return {
        allowed: row.allowed,
        retryAfterSeconds: row.allowed ? 0 : Math.max(1, row.retry_after_seconds),
      };
    });
  }

  public async listTasks(
    workspaceId: string,
    principal: Principal,
    input: {
      cursor?: string | undefined;
      limit: number;
      projectId?: string | undefined;
      status?: Task["status"] | undefined;
    },
  ): Promise<CursorPage<Task>> {
    const after = decodeCursor(input.cursor);
    return this.transaction(async (client) => {
      await this.setTenantContext(client, workspaceId, principal);
      const result = await client.query<TaskRow>(
        `SELECT task.task_id, task.tenant_id, task.project_id, task.title, task.description,
                task.status, task.priority, task.blocked_reason, task.scheduled_date, task.due_date,
                task.position, task.version,
                task.created_at, task.updated_at, task.archived_at,
                task.created_by_subject_type, task.created_by_subject_id,
                claim.subject_type AS claim_subject_type,
                claim.subject_id AS claim_subject_id,
                claim.lease_expires_at AS claim_lease_expires_at
         FROM domain.tasks AS task
         LEFT JOIN domain.task_claims AS claim
           ON claim.tenant_id = task.tenant_id AND claim.task_id = task.task_id
          AND claim.released_at IS NULL AND claim.deleted_at IS NULL
          AND claim.lease_expires_at > now()
         WHERE task.tenant_id = $1::uuid AND task.archived_at IS NULL
           AND task.deleted_at IS NULL
           AND ($2::uuid IS NULL OR task.task_id > $2::uuid)
           AND ($3::uuid IS NULL OR task.project_id = $3::uuid)
           AND ($4::domain.task_status IS NULL OR task.status = $4::domain.task_status)
         ORDER BY task.task_id
         LIMIT $5::integer`,
        [workspaceId, after, input.projectId ?? null, input.status ?? null, input.limit + 1],
      );
      return pageFromRows(result.rows.map(taskFromRow), input.limit, (item) => item.id);
    });
  }

  public async getTask(
    workspaceId: string,
    taskId: string,
    principal: Principal,
  ): Promise<Task | null> {
    return this.transaction(async (client) => {
      await this.setTenantContext(client, workspaceId, principal);
      const result = await client.query<TaskRow>(
        `SELECT task.task_id, task.tenant_id, task.project_id, task.title, task.description,
                task.status, task.priority, task.blocked_reason, task.scheduled_date, task.due_date,
                task.position, task.version,
                task.created_at, task.updated_at, task.archived_at,
                task.created_by_subject_type, task.created_by_subject_id,
                claim.subject_type AS claim_subject_type,
                claim.subject_id AS claim_subject_id,
                claim.lease_expires_at AS claim_lease_expires_at
         FROM domain.tasks AS task
         LEFT JOIN domain.task_claims AS claim
           ON claim.tenant_id = task.tenant_id AND claim.task_id = task.task_id
          AND claim.released_at IS NULL AND claim.deleted_at IS NULL
          AND claim.lease_expires_at > now()
         WHERE task.tenant_id = $1::uuid AND task.task_id = $2::uuid
           AND task.archived_at IS NULL AND task.deleted_at IS NULL`,
        [workspaceId, taskId],
      );
      const row = result.rows[0];
      return row ? taskFromRow(row) : null;
    });
  }

  public async createTask(
    workspaceId: string,
    principal: Principal,
    input: CreateTaskData,
    metadata: MutationMetadata,
  ): Promise<Task> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertWriter(role, principal);
      return this.idempotent(
        client,
        workspaceId,
        principal,
        "create_task",
        metadata,
        input,
        201,
        async () => {
          await this.lockLiveProject(client, workspaceId, input.projectId);
          try {
            const result = await client.query<TaskRow>(
              `INSERT INTO domain.tasks (
                 tenant_id, project_id, title, description, priority, scheduled_date, due_date,
                 created_by_subject_type, created_by_subject_id, position
               )
               SELECT $1::uuid, $2::uuid, $3, $4, $5::domain.task_priority, $6::date, $7::date,
                 $8::domain.subject_type, $9::uuid,
                 COALESCE(max(task.position), 0) + 1000
               FROM domain.tasks AS task
               WHERE task.tenant_id = $1::uuid AND task.project_id = $2::uuid
                 AND task.deleted_at IS NULL
               RETURNING task_id, tenant_id, project_id, title, description, status, priority,
                 blocked_reason, scheduled_date, due_date, position, version, created_at,
                 updated_at, archived_at, created_by_subject_type, created_by_subject_id`,
              [
                workspaceId,
                input.projectId,
                input.title,
                input.description ?? null,
                input.priority,
                input.scheduledDate ?? null,
                input.dueDate ?? null,
                principal.subjectType,
                principal.subjectId,
              ],
            );
            const row = result.rows[0];
            if (!row) throw new DomainError("internal_error", 500, "Task was not created");
            return taskFromRow(row);
          } catch (error) {
            if (hasPostgresCode(error, "23503")) {
              throw new DomainError("not_found", 404, "Project not found");
            }
            throw error;
          }
        },
      );
    });
  }

  public async updateTask(
    workspaceId: string,
    taskId: string,
    principal: Principal,
    expectedVersion: number,
    patch: UpdateTaskData,
    metadata: MutationMetadata,
  ): Promise<Task> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertWriter(role, principal);
      return this.idempotent(
        client,
        workspaceId,
        principal,
        "update_task",
        metadata,
        { taskId, expectedVersion, patch },
        200,
        async () => {
          const assignments = ["version = version + 1"];
          const values: unknown[] = [workspaceId, taskId, expectedVersion];
          const add = (column: string, value: unknown, cast = "") => {
            values.push(value);
            assignments.push(`${column} = $${values.length}${cast}`);
          };
          if (patch.title !== undefined) add("title", patch.title);
          if (patch.description !== undefined) add("description", patch.description);
          if (patch.status !== undefined) add("status", patch.status, "::domain.task_status");
          if (patch.priority !== undefined) {
            add("priority", patch.priority, "::domain.task_priority");
          }
          if (patch.blockedReason !== undefined) add("blocked_reason", patch.blockedReason);
          if (patch.scheduledDate !== undefined) {
            add("scheduled_date", patch.scheduledDate, "::date");
          }
          if (patch.dueDate !== undefined) add("due_date", patch.dueDate, "::date");
          if (patch.position !== undefined) add("position", patch.position, "::numeric");
          if (patch.projectId !== undefined) {
            await this.lockLiveProject(client, workspaceId, patch.projectId);
            add("project_id", patch.projectId, "::uuid");
          }
          if (assignments.length === 1) {
            throw new DomainError("invalid_request", 422, "Task patch cannot be empty");
          }

          try {
            const result = await client.query<TaskRow>(
              `UPDATE domain.tasks
               SET ${assignments.join(", ")}
               WHERE tenant_id = $1::uuid AND task_id = $2::uuid
                 AND version = $3 AND archived_at IS NULL AND deleted_at IS NULL
               RETURNING task_id, tenant_id, project_id, title, description, status, priority,
                 blocked_reason, scheduled_date, due_date, position, version, created_at,
                 updated_at, archived_at, created_by_subject_type, created_by_subject_id`,
              values,
            );
            const row = result.rows[0];
            if (row) return taskFromRow(row);
          } catch (error) {
            if (hasPostgresCode(error, "23503")) {
              throw new DomainError("not_found", 404, "Project not found");
            }
            if (hasPostgresCode(error, "23514") || hasPostgresCode(error, "22P02")) {
              throw new DomainError("invalid_request", 422, "Task state is invalid");
            }
            throw error;
          }

          const currentVersion = await this.currentTaskVersion(client, workspaceId, taskId);
          throw new DomainError(
            "stale_version",
            409,
            `Task version is stale; current version is ${currentVersion}`,
          );
        },
      );
    });
  }

  public async deleteTask(
    workspaceId: string,
    taskId: string,
    principal: Principal,
    expectedVersion: number,
    metadata: MutationMetadata,
  ): Promise<void> {
    await this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertWriter(role, principal);
      await this.idempotent(
        client,
        workspaceId,
        principal,
        "delete_task",
        metadata,
        { taskId, expectedVersion },
        204,
        async () => {
          const result = await client.query(
            `UPDATE domain.tasks
             SET archived_at = now(), version = version + 1
             WHERE tenant_id = $1::uuid AND task_id = $2::uuid
               AND version = $3 AND archived_at IS NULL AND deleted_at IS NULL`,
            [workspaceId, taskId, expectedVersion],
          );
          if (result.rowCount === 1) return { deleted: true };
          const currentVersion = await this.currentTaskVersion(client, workspaceId, taskId);
          throw new DomainError(
            "stale_version",
            409,
            `Task version is stale; current version is ${currentVersion}`,
          );
        },
      );
    });
  }

  public async claimTask(
    workspaceId: string,
    taskId: string,
    principal: Principal,
    expectedVersion: number,
    leaseSeconds: number,
    metadata: MutationMetadata,
  ): Promise<TaskClaim> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertWriter(role, principal);
      return this.idempotent(
        client,
        workspaceId,
        principal,
        "claim_task",
        metadata,
        { taskId, expectedVersion, leaseSeconds },
        200,
        async () => {
          await this.bumpTaskVersion(client, workspaceId, taskId, expectedVersion);
          const result = await client.query<TaskClaimRow>(
            `INSERT INTO domain.task_claims (
               tenant_id, task_id, subject_type, subject_id, lease_expires_at
             ) VALUES (
               $1::uuid, $2::uuid, $3::domain.subject_type, $4::uuid,
               now() + make_interval(secs => $5::integer)
             )
             ON CONFLICT (tenant_id, task_id) DO UPDATE
             SET subject_type = EXCLUDED.subject_type,
                 subject_id = EXCLUDED.subject_id,
                 claimed_at = now(),
                 heartbeat_at = now(),
                 lease_expires_at = EXCLUDED.lease_expires_at,
                 released_at = NULL,
                 deleted_at = NULL
             WHERE task_claims.released_at IS NOT NULL
                OR task_claims.lease_expires_at <= now()
                OR (
                  task_claims.subject_type = EXCLUDED.subject_type
                  AND task_claims.subject_id = EXCLUDED.subject_id
                )
             RETURNING task_id, subject_type, subject_id, claimed_at,
               heartbeat_at, lease_expires_at`,
            [workspaceId, taskId, principal.subjectType, principal.subjectId, leaseSeconds],
          );
          const row = result.rows[0];
          if (!row) throw new DomainError("conflict", 409, "Task is claimed by another principal");
          return claimFromRow(row);
        },
      );
    });
  }

  public async extendClaim(
    workspaceId: string,
    taskId: string,
    principal: Principal,
    expectedVersion: number,
    leaseSeconds: number,
    metadata: MutationMetadata,
  ): Promise<TaskClaim> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertWriter(role, principal);
      return this.idempotent(
        client,
        workspaceId,
        principal,
        "extend_claim",
        metadata,
        { taskId, expectedVersion, leaseSeconds },
        200,
        async () => {
          const result = await client.query<TaskClaimRow>(
            `UPDATE domain.task_claims
             SET heartbeat_at = now(),
                 lease_expires_at = now() + make_interval(secs => $5::integer)
             WHERE tenant_id = $1::uuid AND task_id = $2::uuid
               AND subject_type = $3::domain.subject_type AND subject_id = $4::uuid
               AND released_at IS NULL AND deleted_at IS NULL AND lease_expires_at > now()
             RETURNING task_id, subject_type, subject_id, claimed_at,
               heartbeat_at, lease_expires_at`,
            [workspaceId, taskId, principal.subjectType, principal.subjectId, leaseSeconds],
          );
          const row = result.rows[0];
          if (!row) {
            const currentVersion = await this.currentTaskVersion(client, workspaceId, taskId);
            if (currentVersion !== expectedVersion) {
              throw new DomainError(
                "stale_version",
                409,
                `Task version is stale; current version is ${currentVersion}`,
              );
            }
            throw new DomainError("conflict", 409, "Principal has no active claim");
          }
          await this.bumpTaskVersion(client, workspaceId, taskId, expectedVersion);
          return claimFromRow(row);
        },
      );
    });
  }

  public async releaseClaim(
    workspaceId: string,
    taskId: string,
    principal: Principal,
    expectedVersion: number,
    metadata: MutationMetadata,
  ): Promise<void> {
    await this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertWriter(role, principal);
      await this.idempotent(
        client,
        workspaceId,
        principal,
        "release_claim",
        metadata,
        { taskId, expectedVersion },
        204,
        async () => {
          const result = await client.query(
            `UPDATE domain.task_claims
             SET released_at = now()
             WHERE tenant_id = $1::uuid AND task_id = $2::uuid
               AND subject_type = $3::domain.subject_type AND subject_id = $4::uuid
               AND released_at IS NULL AND deleted_at IS NULL AND lease_expires_at > now()`,
            [workspaceId, taskId, principal.subjectType, principal.subjectId],
          );
          if (result.rowCount !== 1) {
            const currentVersion = await this.currentTaskVersion(client, workspaceId, taskId);
            if (currentVersion !== expectedVersion) {
              throw new DomainError(
                "stale_version",
                409,
                `Task version is stale; current version is ${currentVersion}`,
              );
            }
            throw new DomainError("conflict", 409, "Principal has no active claim");
          }
          await this.bumpTaskVersion(client, workspaceId, taskId, expectedVersion);
          return { released: true };
        },
      );
    });
  }

  public async handoffTask(
    workspaceId: string,
    taskId: string,
    principal: Principal,
    input: {
      expectedVersion: number;
      targetSubjectType: Principal["subjectType"];
      targetSubjectId: string;
      note: string;
    },
    metadata: MutationMetadata,
  ): Promise<TaskClaim> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertWriter(role, principal);
      return this.idempotent(
        client,
        workspaceId,
        principal,
        "handoff_task",
        metadata,
        { taskId, ...input },
        200,
        async () => {
          const target = await client.query(
            `SELECT 1 FROM domain.workspace_memberships
             WHERE tenant_id = $1::uuid AND subject_type = $2::domain.subject_type
               AND subject_id = $3::uuid AND deleted_at IS NULL`,
            [workspaceId, input.targetSubjectType, input.targetSubjectId],
          );
          if (target.rowCount !== 1) {
            throw new DomainError("not_found", 404, "Handoff target not found");
          }

          const claim = await client.query<TaskClaimRow>(
            `UPDATE domain.task_claims
             SET subject_type = $5::domain.subject_type, subject_id = $6::uuid,
                 claimed_at = now(), heartbeat_at = now(),
                 lease_expires_at = now() + interval '30 minutes'
             WHERE tenant_id = $1::uuid AND task_id = $2::uuid
               AND subject_type = $3::domain.subject_type AND subject_id = $4::uuid
               AND released_at IS NULL AND deleted_at IS NULL AND lease_expires_at > now()
             RETURNING task_id, subject_type, subject_id, claimed_at,
               heartbeat_at, lease_expires_at`,
            [
              workspaceId,
              taskId,
              principal.subjectType,
              principal.subjectId,
              input.targetSubjectType,
              input.targetSubjectId,
            ],
          );
          const claimRow = claim.rows[0];
          if (!claimRow) throw new DomainError("conflict", 409, "Principal has no active claim");

          await this.bumpTaskVersion(client, workspaceId, taskId, input.expectedVersion);
          await client.query(
            `INSERT INTO domain.task_handoffs (
               tenant_id, task_id, from_subject_type, from_subject_id,
               to_subject_type, to_subject_id, note
             ) VALUES (
               $1::uuid, $2::uuid, $3::domain.subject_type, $4::uuid,
               $5::domain.subject_type, $6::uuid, $7
             )`,
            [
              workspaceId,
              taskId,
              principal.subjectType,
              principal.subjectId,
              input.targetSubjectType,
              input.targetSubjectId,
              input.note,
            ],
          );
          return claimFromRow(claimRow);
        },
      );
    });
  }

  public async recordTaskEvent(
    workspaceId: string,
    taskId: string,
    principal: Principal,
    input: {
      expectedVersion?: number | undefined;
      eventType: TaskEvent["eventType"];
      content: string;
      origin: TaskEvent["origin"];
      correlationId: string;
    },
    metadata: MutationMetadata,
  ): Promise<TaskEvent> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertWriter(role, principal);
      return this.idempotent(
        client,
        workspaceId,
        principal,
        "record_task_event",
        metadata,
        { taskId, ...input },
        201,
        async () => {
          if (input.expectedVersion === undefined) {
            await this.currentTaskVersion(client, workspaceId, taskId);
          } else {
            await this.bumpTaskVersion(client, workspaceId, taskId, input.expectedVersion);
          }
          const result = await client.query<TaskEventRow>(
            `INSERT INTO domain.task_events (
               tenant_id, task_id, event_type, content, actor_subject_type,
               actor_subject_id, origin, correlation_id
             ) VALUES (
               $1::uuid, $2::uuid, $3::domain.task_event_type, $4,
               $5::domain.subject_type, $6::uuid, $7, $8
             )
             RETURNING event_id, task_id, event_type, content, actor_subject_type,
               actor_subject_id, origin, created_at`,
            [
              workspaceId,
              taskId,
              input.eventType,
              input.content,
              principal.subjectType,
              principal.subjectId,
              input.origin,
              input.correlationId,
            ],
          );
          const row = result.rows[0];
          if (!row) throw new DomainError("internal_error", 500, "Task event was not recorded");
          return eventFromRow(row);
        },
      );
    });
  }

  public async listTaskEvents(
    workspaceId: string,
    taskId: string,
    principal: Principal,
  ): Promise<TaskEvent[]> {
    return this.transaction(async (client) => {
      await this.setTenantContext(client, workspaceId, principal);
      await this.currentTaskVersion(client, workspaceId, taskId);
      const result = await client.query<TaskEventRow>(
        `SELECT event_id, task_id, event_type, content, actor_subject_type,
           actor_subject_id, origin, created_at
         FROM domain.task_events
         WHERE tenant_id = $1::uuid AND task_id = $2::uuid AND deleted_at IS NULL
         ORDER BY created_at, event_id`,
        [workspaceId, taskId],
      );
      return result.rows.map(eventFromRow);
    });
  }

  public async createServiceAccount(
    workspaceId: string,
    principal: Principal,
    input: { name: string; description?: string | undefined },
  ): Promise<ServiceAccount> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertManager(role, principal);
      const result = await client.query<ServiceAccountRow>(
        `INSERT INTO domain.service_accounts
           (tenant_id, name, description, created_by_user_id)
         VALUES ($1::uuid, $2, $3, $4::uuid)
         RETURNING service_account_id, tenant_id, name, description, created_at`,
        [workspaceId, input.name, input.description ?? null, principal.subjectId],
      );
      const row = result.rows[0];
      if (!row) throw new DomainError("internal_error", 500, "Service account was not created");
      await client.query(
        `INSERT INTO domain.workspace_memberships
           (tenant_id, subject_type, subject_id, role)
         VALUES ($1::uuid, 'service_account', $2::uuid, 'member')`,
        [workspaceId, row.service_account_id],
      );
      return serviceAccountFromRow(row);
    });
  }

  public async listServiceAccounts(
    workspaceId: string,
    principal: Principal,
  ): Promise<ServiceAccount[]> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertManager(role, principal);
      const result = await client.query<ServiceAccountRow>(
        `SELECT service_account_id, tenant_id, name, description, created_at
         FROM domain.service_accounts
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL
         ORDER BY service_account_id`,
        [workspaceId],
      );
      return result.rows.map(serviceAccountFromRow);
    });
  }

  public async revokeServiceAccount(
    workspaceId: string,
    serviceAccountId: string,
    principal: Principal,
  ): Promise<void> {
    await this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertManager(role, principal);
      const result = await client.query(
        `UPDATE domain.service_accounts
         SET deleted_at = now()
         WHERE tenant_id = $1::uuid AND service_account_id = $2::uuid
           AND deleted_at IS NULL`,
        [workspaceId, serviceAccountId],
      );
      if (result.rowCount !== 1) {
        throw new DomainError("not_found", 404, "Service account not found");
      }
      await client.query(
        `UPDATE domain.api_tokens
         SET revoked_at = COALESCE(revoked_at, now()), deleted_at = now()
         WHERE tenant_id = $1::uuid AND service_account_id = $2::uuid
           AND deleted_at IS NULL`,
        [workspaceId, serviceAccountId],
      );
      await client.query(
        `UPDATE domain.workspace_memberships
         SET deleted_at = now()
         WHERE tenant_id = $1::uuid AND subject_type = 'service_account'
           AND subject_id = $2::uuid AND deleted_at IS NULL`,
        [workspaceId, serviceAccountId],
      );
    });
  }

  public async createApiToken(
    workspaceId: string,
    principal: Principal,
    input: {
      serviceAccountId: string;
      name: string;
      scopes: ApiToken["scopes"];
      expiresAt?: string | undefined;
    },
  ): Promise<CreatedApiToken> {
    const prefix = randomBytes(9).toString("base64url");
    const secret = randomBytes(32).toString("base64url");
    const token = `bks_${prefix}.${secret}`;
    const secretHash = createHash("sha256").update(secret).digest("hex");
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertManager(role, principal);
      const result = await client.query<ApiTokenRow>(
        `INSERT INTO domain.api_tokens
           (tenant_id, service_account_id, name, token_prefix, secret_hash, scopes, expires_at)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::text[], $7::timestamptz)
         RETURNING token_id, service_account_id, name, token_prefix, scopes,
           expires_at, last_used_at, revoked_at, created_at`,
        [
          workspaceId,
          input.serviceAccountId,
          input.name,
          prefix,
          secretHash,
          input.scopes,
          input.expiresAt ?? null,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new DomainError("internal_error", 500, "API token was not created");
      return { token, metadata: apiTokenFromRow(row) };
    });
  }

  public async listApiTokens(workspaceId: string, principal: Principal): Promise<ApiToken[]> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertManager(role, principal);
      const result = await client.query<ApiTokenRow>(
        `SELECT token_id, service_account_id, name, token_prefix, scopes,
           expires_at, last_used_at, revoked_at, created_at
         FROM domain.api_tokens
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL
         ORDER BY token_id`,
        [workspaceId],
      );
      return result.rows.map(apiTokenFromRow);
    });
  }

  public async revokeApiToken(
    workspaceId: string,
    tokenId: string,
    principal: Principal,
  ): Promise<void> {
    return this.transaction(async (client) => {
      const role = await this.setTenantContext(client, workspaceId, principal);
      this.assertManager(role, principal);
      const result = await client.query(
        `UPDATE domain.api_tokens SET revoked_at = COALESCE(revoked_at, now())
         WHERE tenant_id = $1::uuid AND token_id = $2::uuid AND deleted_at IS NULL`,
        [workspaceId, tokenId],
      );
      if (result.rowCount !== 1) throw new DomainError("not_found", 404, "API token not found");
    });
  }
}
