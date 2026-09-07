import { describe, expect, it } from "vitest";
import { positionAfterLast, positionBetween } from "@/lib/backlog/position";

describe("positionAfterLast", () => {
  it("starts a column at the step size when empty", () => {
    expect(Number(positionAfterLast(undefined))).toBe(1024);
  });

  it("appends after the last known position", () => {
    expect(Number(positionAfterLast("1024"))).toBe(2048);
  });

  it("matches the contracts fractional-position pattern", () => {
    const pattern = /^\d+(\.\d+)?$/;
    expect(positionAfterLast("1024.5")).toMatch(pattern);
  });
});

describe("positionBetween", () => {
  it("halves the gap when both neighbors exist", () => {
    expect(Number(positionBetween("1024", "2048"))).toBe(1536);
  });

  it("falls back to appendAfterLast when there is no upper neighbor", () => {
    expect(Number(positionBetween("1024", undefined))).toBe(2048);
  });

  it("halves the lower neighbor when there is no lower bound", () => {
    expect(Number(positionBetween(undefined, "1024"))).toBe(512);
  });
});
