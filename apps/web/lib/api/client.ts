import type { ProblemDetail } from "@backlog-syntax/contracts";
import { env } from "@/lib/env";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ProblemDetail["code"];
  readonly traceId: string;
  readonly fieldErrors: ProblemDetail["errors"];

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title);
    this.name = "ApiError";
    this.status = problem.status;
    this.code = problem.code;
    this.traceId = problem.traceId;
    this.fieldErrors = problem.errors;
  }
}

/** Thrown when the API is unreachable (network failure), distinct from a returned Problem Detail. */
export class ApiUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Não foi possível conectar à API");
    this.name = "ApiUnavailableError";
    this.cause = cause;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Optimistic concurrency precondition, per ADR 0005. Sent as `If-Match` on REST. */
  ifMatchVersion?: number;
  /** Required on every non-idempotent mutation so a double-submit cannot duplicate an effect. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.ifMatchVersion !== undefined) headers["If-Match"] = `"${options.ifMatchVersion}"`;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  const init: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
    headers,
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  if (options.signal) init.signal = options.signal;

  let response: Response;
  try {
    response = await fetch(new URL(path, env.NEXT_PUBLIC_API_URL), init);
  } catch (cause) {
    throw new ApiUnavailableError(cause);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("json") ? await response.json() : undefined;

  if (!response.ok) {
    if (payload && typeof payload === "object" && "code" in payload) {
      throw new ApiError(payload as ProblemDetail);
    }
    throw new ApiError({
      type: "about:blank",
      title: response.statusText || "Erro inesperado",
      status: response.status,
      traceId: response.headers.get("x-request-id") ?? "unknown",
      code: "internal_error",
    });
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, signal ? { method: "GET", signal } : { method: "GET" }),
  post: <T>(path: string, body: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options: Omit<RequestOptions, "method"> = {}) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
