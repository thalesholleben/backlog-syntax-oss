import { afterEach, describe, expect, it } from "vitest";
import { errorResult, isWebMcpSupported, textResult } from "@/lib/webmcp/types";

describe("isWebMcpSupported", () => {
  afterEach(() => {
    delete document.modelContext;
  });

  it("is false when document.modelContext is absent (today's baseline browser)", () => {
    expect(isWebMcpSupported()).toBe(false);
  });

  it("is false when modelContext exists but registerTool is not a function", () => {
    // @ts-expect-error intentionally malformed for the test
    document.modelContext = {};
    expect(isWebMcpSupported()).toBe(false);
  });

  it("is true only once document.modelContext.registerTool is callable", () => {
    document.modelContext = { registerTool: () => undefined };
    expect(isWebMcpSupported()).toBe(true);
  });
});

describe("tool result helpers", () => {
  it("wraps text without an error flag by default", () => {
    expect(textResult("ok")).toEqual({ content: [{ type: "text", text: "ok" }] });
  });

  it("marks isError on failure results", () => {
    expect(errorResult("nope")).toEqual({
      content: [{ type: "text", text: "nope" }],
      isError: true,
    });
  });
});
