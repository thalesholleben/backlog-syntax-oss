import { afterEach, describe, expect, it, vi } from "vitest";
import { listAllTasks } from "@/lib/api/tasks";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("listAllTasks", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("follows every opaque cursor before returning the workspace snapshot", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ data: [{ id: "first" }], page: { nextCursor: "page-two", hasMore: true } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: [{ id: "second" }], page: { nextCursor: null, hasMore: false } }),
      );

    const result = await listAllTasks("workspace-id");
    const calls = vi.mocked(global.fetch).mock.calls;

    expect(result.data.map((task) => task.id)).toEqual(["first", "second"]);
    expect(new URL(calls[0]?.[0] as URL).searchParams.get("limit")).toBe("100");
    expect(new URL(calls[1]?.[0] as URL).searchParams.get("cursor")).toBe("page-two");
    expect(result.page).toEqual({ nextCursor: null, hasMore: false });
  });

  it("stops a faulty API from producing an unbounded cursor loop", async () => {
    let cursorNumber = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      cursorNumber += 1;
      return Promise.resolve(
        jsonResponse({
          data: [],
          page: { nextCursor: `cursor-${cursorNumber}`, hasMore: true },
        }),
      );
    });

    await expect(listAllTasks("workspace-id")).rejects.toThrow("limite seguro de páginas");
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(100);
  });
});
