import type { ProblemCode } from "@backlog-syntax/contracts";

export class DomainError extends Error {
  public constructor(
    public readonly code: ProblemCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
