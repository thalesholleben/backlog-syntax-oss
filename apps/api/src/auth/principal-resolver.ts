import {
  IdentifierSchema,
  SubjectTypeSchema,
  WorkspaceRoleSchema,
} from "@backlog-syntax/contracts";
import type { Context } from "hono";
import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { Principal } from "../domain/principal.js";
import type { ProductAuth } from "./runtime.mjs";

export type PrincipalResolver = (context: Context) => Promise<Principal | null>;

export function createTestPrincipalResolver(isEnabled: boolean): PrincipalResolver {
  return async (context) => {
    if (!isEnabled) return null;

    const subjectId = IdentifierSchema.safeParse(context.req.header("x-test-subject-id"));
    const subjectType = SubjectTypeSchema.safeParse(
      context.req.header("x-test-subject-type") ?? "user",
    );
    const role = WorkspaceRoleSchema.safeParse(
      context.req.header("x-test-workspace-role") ?? "owner",
    );
    if (!subjectId.success || !subjectType.success || !role.success) return null;

    return {
      subjectId: subjectId.data,
      subjectType: subjectType.data,
      role: role.data,
      scopes: ["read", "write"],
      authentication: "test",
    };
  };
}

interface PatPrincipalRow {
  tenant_id: string;
  service_account_id: string;
  scopes: string[];
}

function parsePat(authorization: string | undefined): { prefix: string; hash: string } | null {
  if (!authorization?.startsWith("Bearer bks_")) return null;
  const token = authorization.slice("Bearer bks_".length);
  const separator = token.indexOf(".");
  if (separator < 8) return null;
  const prefix = token.slice(0, separator);
  const secret = token.slice(separator + 1);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(prefix) || !/^[A-Za-z0-9_-]{32,128}$/.test(secret)) {
    return null;
  }
  return { prefix, hash: createHash("sha256").update(secret).digest("hex") };
}

export function createPrincipalResolver(options: {
  auth: ProductAuth;
  appPool: Pool;
  allowTestPrincipal: boolean;
}): PrincipalResolver {
  const testResolver = createTestPrincipalResolver(options.allowTestPrincipal);

  return async (context) => {
    const parsedPat = parsePat(context.req.header("authorization"));
    if (parsedPat) {
      const result = await options.appPool.query<PatPrincipalRow>(
        `SELECT tenant_id, service_account_id, scopes
         FROM private.authenticate_pat($1, $2)`,
        [parsedPat.prefix, parsedPat.hash],
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        subjectType: "service_account",
        subjectId: row.service_account_id,
        role: "member",
        scopes: row.scopes,
        workspaceId: row.tenant_id,
        authentication: "pat",
      };
    }

    const session = await options.auth.api.getSession({ headers: context.req.raw.headers });
    if (
      session?.user.termsAcceptedAt &&
      session.user.privacyNoticeAcceptedAt &&
      session.user.legalNoticeVersion
    ) {
      return {
        subjectType: "user",
        subjectId: session.user.id,
        role: "viewer",
        scopes: ["read", "write"],
        authentication: "session",
      };
    }

    return testResolver(context);
  };
}
