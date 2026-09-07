import { describe, expect, it } from "vitest";
import { MCP_TOOL_CONTRACTS, ProblemDetailSchema } from "../src/index.js";

describe("public contracts", () => {
  it("adds workspace discovery to the ten core MCP tools", () => {
    expect(Object.keys(MCP_TOOL_CONTRACTS)).toHaveLength(11);
    expect(MCP_TOOL_CONTRACTS.list_workspaces.requiredScope).toBe("read");
  });

  it("accepts discovery without identity selectors and bounds pagination", () => {
    const schema = MCP_TOOL_CONTRACTS.list_workspaces.inputSchema;
    expect(schema.parse({})).toEqual({ limit: 20 });
    expect(schema.parse({ limit: 100 })).toEqual({ limit: 100 });
    for (const input of [
      { workspaceId: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7531" },
      { subjectId: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7531" },
      { principal: { role: "admin" } },
      { limit: 0 },
      { limit: 101 },
      { limit: 1.5 },
      { limit: true },
      { limit: "100" },
      { cursor: "" },
    ]) {
      expect(schema.safeParse(input).success).toBe(false);
    }
    expect(MCP_TOOL_CONTRACTS.get_workspace_context.inputSchema.safeParse({}).success).toBe(false);
  });

  it("keeps tool discovery inside the context budget", () => {
    const discovery = Object.entries(MCP_TOOL_CONTRACTS).map(([name, contract]) => ({
      name,
      description: contract.description,
      inputSchema: contract.inputSchema.toJSONSchema(),
    }));

    expect(Buffer.byteLength(JSON.stringify(discovery), "utf8")).toBeLessThan(16_000);
  });

  it("rejects unknown Problem Details fields", () => {
    const result = ProblemDetailSchema.safeParse({
      type: "https://api.backlog.test/problems/not-found",
      title: "Not found",
      status: 404,
      traceId: "trace-1",
      code: "not_found",
      stack: "must not leak",
    });

    expect(result.success).toBe(false);
  });

  it("exposes a stable Problem Details code for oversized payloads", () => {
    const result = ProblemDetailSchema.parse({
      type: "https://api.backlog.test/problems/payload-too-large",
      title: "Payload is too large",
      status: 413,
      traceId: "trace-payload-limit",
      code: "payload_too_large",
    });

    expect(result.code).toBe("payload_too_large");
  });
});
