import type { AccountDeletionReceipt, AccountExport, Workspace } from "@backlog-syntax/contracts";
import { AccountDeletionReceiptSchema, AccountExportSchema } from "@backlog-syntax/contracts";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import type { ProductAuth } from "../auth/runtime.mjs";
import { DomainError } from "../domain/errors.js";
import type { Principal } from "../domain/principal.js";

const ACCOUNT_DELETION_FRESH_AGE_MS = 15 * 60 * 1_000;

interface MembershipRow extends QueryResultRow {
  tenant_id: string;
  name: string;
  slug: string;
  role: Workspace["role"];
}

interface DeletionReceiptRow extends QueryResultRow {
  receipt_id: string;
  deleted_at: Date;
  memberships_removed: number;
}

function postgresCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

export class AccountPrivacyService {
  public constructor(
    private readonly pool: Pool,
    private readonly auth: ProductAuth,
  ) {}

  private assertHumanSession(principal: Principal): void {
    if (principal.subjectType !== "user" || principal.authentication !== "session") {
      throw new DomainError("forbidden", 403, "A human browser session is required");
    }
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

  private async setSelfContext(client: PoolClient, principal: Principal): Promise<void> {
    await client.query(
      `SELECT set_config('app.subject_type', 'user', true),
         set_config('app.subject_id', $1::text, true)`,
      [principal.subjectId],
    );
  }

  public async exportAccount(principal: Principal): Promise<AccountExport> {
    this.assertHumanSession(principal);
    return this.transaction(async (client) => {
      await this.setSelfContext(client, principal);
      const profileResult = await client.query<{ payload: unknown }>(
        "SELECT private.export_own_account($1::uuid) AS payload",
        [principal.subjectId],
      );
      const payload = profileResult.rows[0]?.payload;
      if (!payload || typeof payload !== "object") {
        throw new DomainError("not_found", 404, "Account not found");
      }

      const memberships: MembershipRow[] = [];
      let cursor: string | null = null;
      do {
        const page: { rows: MembershipRow[] } = await client.query<MembershipRow>(
          `SELECT tenant_id, name, slug, role
           FROM private.list_subject_workspaces('user', $1::uuid, $2::uuid, 101)`,
          [principal.subjectId, cursor],
        );
        memberships.push(...page.rows);
        cursor = page.rows.length === 101 ? (page.rows.at(-1)?.tenant_id ?? null) : null;
      } while (cursor);

      return AccountExportSchema.parse({
        exportedAt: new Date().toISOString(),
        ...payload,
        memberships: memberships.map((membership) => ({
          workspaceId: membership.tenant_id,
          workspaceName: membership.name,
          workspaceSlug: membership.slug,
          role: membership.role,
        })),
      });
    });
  }

  public async deleteAccount(
    request: Request,
    principal: Principal,
    email: string,
  ): Promise<AccountDeletionReceipt> {
    this.assertHumanSession(principal);
    const session = await this.auth.api.getSession({ headers: request.headers });
    if (!session || session.user.id !== principal.subjectId) {
      throw new DomainError("unauthenticated", 401, "Authentication is required");
    }
    const createdAt = new Date(session.session.createdAt).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt >= ACCOUNT_DELETION_FRESH_AGE_MS) {
      throw new DomainError(
        "reauthentication_required",
        409,
        "Sign in again before deleting the account",
      );
    }

    try {
      return await this.transaction(async (client) => {
        await this.setSelfContext(client, principal);
        const result = await client.query<DeletionReceiptRow>(
          `SELECT receipt_id, deleted_at, memberships_removed
           FROM private.delete_own_account($1::uuid, $2)`,
          [principal.subjectId, email],
        );
        const receipt = result.rows[0];
        if (!receipt) throw new DomainError("internal_error", 500, "Deletion did not complete");
        return AccountDeletionReceiptSchema.parse({
          receiptId: receipt.receipt_id,
          deletedAt: receipt.deleted_at.toISOString(),
          membershipsRemoved: receipt.memberships_removed,
        });
      });
    } catch (error) {
      if (postgresCode(error) === "P0001") {
        throw new DomainError(
          "sole_owner_workspace",
          409,
          "Transfer ownership or delete sole-owner workspaces first",
        );
      }
      if (postgresCode(error) === "22023") {
        throw new DomainError("invalid_confirmation", 422, "Confirmation email does not match");
      }
      console.error("account_deletion_failed", {
        code: postgresCode(error) ?? "unknown",
        constraint:
          typeof error === "object" && error !== null && "constraint" in error
            ? String(error.constraint)
            : undefined,
      });
      throw error;
    }
  }
}
