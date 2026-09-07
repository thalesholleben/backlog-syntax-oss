import { describe, expect, it } from "vitest";
import { createFoundationApp } from "../src/app.js";
import { createGetWorkspaceContextUseCase } from "../src/domain/workspace-context.js";
import {
  FOUNDATION_FIXTURE,
  MockWorkspaceContextRepository,
} from "../src/infrastructure/mock-workspace-context.js";
import { callGetWorkspaceContextTool } from "../src/mcp/server.js";

const principal = {
  subjectType: "user" as const,
  subjectId: FOUNDATION_FIXTURE.userId,
  role: "owner" as const,
  scopes: ["read", "write"],
};

describe("REST and MCP scenario equivalence", () => {
  it("returns the same workspace context through both presenters", async () => {
    const repository = new MockWorkspaceContextRepository();
    const useCase = createGetWorkspaceContextUseCase(repository);
    const app = createFoundationApp({
      config: {
        ALLOW_TEST_PRINCIPAL: true,
        PUBLIC_API_URL: "https://api.example.test",
        WEB_ORIGIN: "https://app.example.test",
      },
    });

    const restResponse = await app.request(
      `/v1/workspaces/${FOUNDATION_FIXTURE.workspaceId}/context`,
      { headers: { "x-test-subject-id": principal.subjectId } },
    );
    const restContext = await restResponse.json();
    const mcpResult = await callGetWorkspaceContextTool(useCase, principal, {
      workspaceId: FOUNDATION_FIXTURE.workspaceId,
    });

    expect(restResponse.status).toBe(200);
    expect(mcpResult.structuredContent).toEqual(restContext);
    const firstContent = mcpResult.content[0];
    expect(firstContent?.type).toBe("text");
    if (firstContent?.type === "text") {
      expect(firstContent.text).toContain("untrusted data");
    }
  });
});
