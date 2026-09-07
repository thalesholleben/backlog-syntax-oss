const STEP = 1024;

/** Matches the shared fractional-position schema in @backlog-syntax/contracts (task.ts). */
export function positionAfterLast(lastPosition: string | undefined): string {
  const last = lastPosition ? Number.parseFloat(lastPosition) : 0;
  return String(last + STEP);
}

export function positionBetween(before: string | undefined, after: string | undefined): string {
  if (!before) return after ? String(Number.parseFloat(after) / 2) : String(STEP);
  if (!after) return positionAfterLast(before);
  return String((Number.parseFloat(before) + Number.parseFloat(after)) / 2);
}
