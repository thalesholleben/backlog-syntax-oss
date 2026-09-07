import type { RequestOptions } from "node:https";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchClientMetadataResource } from "../src/auth/runtime.mjs";

const transport = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: transport.lookup }));
vi.mock("node:https", () => ({ request: transport.request }));

const metadataUrl = "https://metadata.example/client.json?version=1";
const ipv4 = { address: "8.8.8.8", family: 4 };
const ipv6 = { address: "2606:4700:4700::1111", family: 6 };

function serveMetadata(statusCode = 200) {
  const response = Object.assign(
    Readable.from([Buffer.from(JSON.stringify({ client_id: metadataUrl }))]),
    { statusCode, headers: { "content-type": "application/json" } },
  );
  const request = { setTimeout: vi.fn(), on: vi.fn(), end: vi.fn(), destroy: vi.fn() };
  transport.request.mockImplementation(
    (_options: RequestOptions, onResponse: (value: typeof response) => void) => {
      request.end.mockImplementation(() => onResponse(response));
      return request;
    },
  );
  return request;
}

function requestOptions(): RequestOptions {
  expect(transport.request).toHaveBeenCalledOnce();
  return transport.request.mock.calls[0]?.[0] as RequestOptions;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("CIMD HTTPS transport", () => {
  it.each([
    ["IPv4", [ipv4]],
    ["IPv6", [ipv6]],
    ["dual-stack", [ipv6, ipv4]],
  ])("returns validated %s candidates for Node autoSelectFamily", async (_name, addresses) => {
    transport.lookup.mockResolvedValueOnce(addresses);
    const request = serveMetadata();

    const response = await fetchClientMetadataResource(metadataUrl);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ client_id: metadataUrl });

    const options = requestOptions();
    const callback = vi.fn();
    // Node 24 requests all addresses, not the scalar dns.lookup overload.
    options.lookup?.("metadata.example", { all: true, family: 0 }, callback);
    expect(callback).toHaveBeenCalledExactlyOnceWith(null, addresses);
    expect(options).toMatchObject({
      protocol: "https:",
      hostname: "metadata.example",
      servername: "metadata.example",
      port: 443,
      path: "/client.json?version=1",
      method: "GET",
      headers: { accept: "application/json", host: "metadata.example" },
    });
    expect(options.rejectUnauthorized).not.toBe(false);
    expect(request.setTimeout).toHaveBeenCalledExactlyOnceWith(5_000, expect.any(Function));
    expect(transport.lookup).toHaveBeenCalledExactlyOnceWith("metadata.example", {
      all: true,
      verbatim: true,
    });
  });

  it("keeps scalar lookup pinned and never resolves DNS again", async () => {
    transport.lookup.mockResolvedValueOnce([ipv6, ipv4]);
    // A second resolution would see a rebound private IP. It must never happen.
    transport.lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    serveMetadata();
    await fetchClientMetadataResource(new URL(metadataUrl));
    const options = requestOptions();
    const callback = vi.fn();

    options.lookup?.("metadata.example", { all: false }, callback);
    expect(callback).toHaveBeenLastCalledWith(null, ipv6.address, ipv6.family);
    options.lookup?.("metadata.example", {}, callback);
    expect(callback).toHaveBeenLastCalledWith(null, ipv6.address, ipv6.family);
    options.lookup?.("metadata.example", { all: true }, callback);
    expect(callback).toHaveBeenLastCalledWith(null, [ipv6, ipv4]);
    expect(transport.lookup).toHaveBeenCalledOnce();
  });

  it.each([
    ["mixed private", [ipv4, { address: "10.0.0.1", family: 4 }]],
    ["private only", [{ address: "::1", family: 6 }]],
    ["empty", []],
  ])("rejects %s DNS answers before any HTTPS request", async (_name, addresses) => {
    transport.lookup.mockResolvedValueOnce(addresses);
    await expect(fetchClientMetadataResource(metadataUrl)).rejects.toThrow("public addresses");
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("rejects redirects after a successful transport without making a second request", async () => {
    transport.lookup.mockResolvedValueOnce([ipv4]);
    serveMetadata(302);
    await expect(fetchClientMetadataResource(new Request(metadataUrl))).rejects.toThrow(
      "redirects",
    );
    expect(transport.request).toHaveBeenCalledOnce();
    expect(transport.lookup).toHaveBeenCalledOnce();
  });
});
