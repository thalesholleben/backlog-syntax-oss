import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, ApiUnavailableError, apiClient } from "@/lib/api/client";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

describe("apiClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("sends credentials, JSON content-type and Idempotency-Key on mutations", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1" }));

    await apiClient.post("/v1/workspaces", { name: "Acme" }, { idempotencyKey: "abc-123" });

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Idempotency-Key"]).toBe("abc-123");
  });

  it("sends If-Match with the quoted version on optimistic-concurrency mutations", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1" }));

    await apiClient.patch(
      "/v1/tasks/1",
      { status: "done" },
      { ifMatchVersion: 4, idempotencyKey: "k" },
    );

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["If-Match"]).toBe('"4"');
  });

  it("throws ApiError with the Problem Details fields on a non-2xx JSON response", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          type: "about:blank",
          title: "Conflict",
          status: 409,
          traceId: "trace-1",
          code: "stale_version",
        },
        { status: 409 },
      ),
    );

    await expect(apiClient.get("/v1/tasks/1")).rejects.toMatchObject({
      status: 409,
      code: "stale_version",
      traceId: "trace-1",
    });
  });

  it("wraps a network failure in ApiUnavailableError instead of leaking the raw error", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(apiClient.get("/v1/tasks/1")).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it("exposes ApiError as an Error subclass for instanceof checks", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { type: "about:blank", title: "Nope", status: 403, traceId: "t", code: "forbidden" },
        { status: 403 },
      ),
    );

    try {
      await apiClient.get("/v1/tasks/1");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);
    }
  });
});
