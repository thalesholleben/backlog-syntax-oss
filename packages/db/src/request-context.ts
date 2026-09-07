import { type SQL, sql } from "drizzle-orm";

export type RequestSubjectType = "user" | "service_account";

export interface RequestContext {
  tenantId: string;
  subjectType: RequestSubjectType;
  subjectId: string;
}

export interface SqlExecutor {
  execute(query: SQL): Promise<unknown>;
}

/** Must be called on the transaction object that will execute domain queries. */
export async function setRequestContextInTransaction(
  transaction: SqlExecutor,
  context: RequestContext,
): Promise<void> {
  await transaction.execute(sql`
    select private.set_request_context(
      ${context.tenantId}::uuid,
      ${context.subjectType}::domain.subject_type,
      ${context.subjectId}::uuid
    )
  `);
}
