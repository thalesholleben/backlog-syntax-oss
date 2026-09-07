import type { Pool } from "pg";
import type { McpHttpHandler } from "@modelcontextprotocol/server";
import type { ApiConfig } from "../config.js";

export interface ProductAuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    termsAcceptedAt?: Date | string | null;
    privacyNoticeAcceptedAt?: Date | string | null;
    legalNoticeVersion?: string | null;
  };
  session: { id: string; userId: string; createdAt: Date; expiresAt: Date };
}

export interface ProductAuth {
  handler(request: Request): Promise<Response>;
  api: {
    getSession(input: { headers: Headers }): Promise<ProductAuthSession | null>;
  };
}

export interface ProductAuthOptions {
  sendResetPassword?: (
    data: { user: { id: string; email: string; name: string }; url: string; token: string },
    request?: Request,
  ) => Promise<void>;
  fetchClientMetadataResource?: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
}

export declare function assertPublicMetadataUrl(value: string): { url: URL; hostname: string };
export declare function isPublicAddress(address: string, family: number): boolean;
export declare function resolvePublicAddresses(
  hostname: string,
  resolver?: (
    hostname: string,
    options: { all: true; verbatim: true },
  ) => Promise<Array<{ address: string; family: number }>>,
  timeoutMs?: number,
): Promise<Array<{ address: string; family: number }>>;
export declare function readMetadataResponse(
  response: NodeJS.ReadableStream & {
    statusCode?: number;
    headers: Record<string, string | string[] | undefined>;
    resume(): void;
  },
  abortRequest: (error: Error) => void,
): Promise<Response>;
export declare function fetchClientMetadataResource(
  input: string | URL | Request,
): Promise<Response>;

export declare function createProductAuth(
  pool: Pool,
  config: Pick<
    ApiConfig,
    | "AUTH_SECRET"
    | "GOOGLE_CLIENT_ID"
    | "GOOGLE_CLIENT_SECRET"
    | "PUBLIC_API_URL"
    | "SESSION_COOKIE_NAME"
    | "WEB_ORIGIN"
  >,
  options?: ProductAuthOptions,
): ProductAuth;

export declare function createProtectedProductMcpEndpoint(
  auth: ProductAuth,
  config: Pick<ApiConfig, "PUBLIC_API_URL">,
  transport: McpHttpHandler,
): (request: Request) => Promise<Response>;
