import { describe, expect, it } from "vitest";
import { AGING_WARNING_HOURS, isAging, relativeAge } from "@/lib/task-presentation";

describe("relativeAge", () => {
  const now = new Date("2026-08-31T12:00:00Z");

  it("rounds sub-minute durations to 'agora'", () => {
    expect(relativeAge("2026-08-31T11:59:50Z", now)).toBe("agora");
  });

  it("formats minutes, hours and days at their own scale", () => {
    expect(relativeAge("2026-08-31T11:50:00Z", now)).toBe("10min");
    expect(relativeAge("2026-08-31T09:00:00Z", now)).toBe("3h");
    expect(relativeAge("2026-08-29T12:00:00Z", now)).toBe("2d");
  });
});

describe("isAging", () => {
  const now = new Date("2026-08-31T12:00:00Z");

  it("is false just under the aging threshold", () => {
    const justUnder = new Date(
      now.getTime() - (AGING_WARNING_HOURS - 1) * 60 * 60 * 1000,
    ).toISOString();
    expect(isAging(justUnder, now)).toBe(false);
  });

  it("is true at or beyond the aging threshold", () => {
    const atThreshold = new Date(
      now.getTime() - AGING_WARNING_HOURS * 60 * 60 * 1000,
    ).toISOString();
    expect(isAging(atThreshold, now)).toBe(true);
  });
});
