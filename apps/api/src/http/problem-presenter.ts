import type { ProblemDetail } from "@backlog-syntax/contracts";
import { DomainError } from "../domain/errors.js";

export function presentProblem(error: unknown, instance: string, traceId: string): ProblemDetail {
  if (error instanceof DomainError) {
    return {
      type: `https://api.backlog-syntax.dev/problems/${error.code}`,
      title: error.message,
      status: error.status,
      instance,
      traceId,
      code: error.code,
    };
  }

  return {
    type: "https://api.backlog-syntax.dev/problems/internal-error",
    title: "Internal server error",
    status: 500,
    instance,
    traceId,
    code: "internal_error",
  };
}
