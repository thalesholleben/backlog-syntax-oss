import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import {
  assertPublicMetadataUrl,
  isPublicAddress,
  readMetadataResponse,
  resolvePublicAddresses,
} from "../src/auth/runtime.mjs";

function metadataResponse(statusCode: number, chunks: Buffer[]) {
  const stream = Readable.from(chunks) as Readable & {
    statusCode: number;
    headers: Record<string, string>;
  };
  stream.statusCode = statusCode;
  stream.headers = { "content-type": "application/json" };
  return stream;
}

describe("CIMD metadata SSRF boundary", () => {
  it.each([
    ["127.0.0.1", 4, false],
    ["169.254.169.254", 4, false],
    ["10.0.0.1", 4, false],
    ["192.0.0.1", 4, false],
    ["192.0.2.1", 4, false],
    ["198.18.0.1", 4, false],
    ["198.51.100.1", 4, false],
    ["203.0.113.1", 4, false],
    ["8.8.8.8", 4, true],
    ["::1", 6, false],
    ["fd00::1", 6, false],
    ["fe80::1", 6, false],
    ["2001:db8::1", 6, false],
    ["2001:2::1", 6, false],
    ["2002:0808:0808::1", 6, false],
    ["2002:7f00:1::", 6, false],
    ["3ffe::1", 6, false],
    ["3fff::1", 6, false],
    ["2606:4700:4700::1111", 6, true],
    ["::ffff:192.168.1.1", 6, false],
    ["::ffff:8.8.8.8", 6, true],
  ])("classifies %s", (address, family, expected) => {
    expect(isPublicAddress(address, family)).toBe(expected);
  });

  it.each([
    "http://metadata.example/client.json",
    "https://127.0.0.1/client.json",
    "https://[::1]/client.json",
    "https://user:secret@metadata.example/client.json",
    "https://metadata.example:8443/client.json",
  ])("rejects unsafe metadata URL %s", (url) => {
    expect(() => assertPublicMetadataUrl(url)).toThrow();
  });

  it("rejects mixed public and private DNS answers before pinning", async () => {
    await expect(
      resolvePublicAddresses("metadata.example", async () => [
        { address: "8.8.8.8", family: 4 },
        { address: "10.0.0.1", family: 4 },
      ]),
    ).rejects.toThrow("public addresses");
  });

  it.each(["192.0.2.1", "198.18.0.1", "203.0.113.1"])(
    "rejects a mixed DNS answer containing reserved address %s",
    async (reserved) => {
      await expect(
        resolvePublicAddresses("metadata.example", async () => [
          { address: "2606:4700:4700::1111", family: 6 },
          { address: reserved, family: 4 },
        ]),
      ).rejects.toThrow("public addresses");
    },
  );

  it("rejects a mixed DNS answer containing historical 6bone space", async () => {
    await expect(
      resolvePublicAddresses("metadata.example", async () => [
        { address: "2606:4700:4700::1111", family: 6 },
        { address: "3ffe::1", family: 6 },
      ]),
    ).rejects.toThrow("public addresses");
  });

  it("bounds DNS resolution time", async () => {
    await expect(
      resolvePublicAddresses("metadata.example", () => new Promise(() => undefined), 5),
    ).rejects.toThrow("DNS resolution timed out");
  });

  it("rejects redirects without following them", async () => {
    const response = metadataResponse(302, []);
    const resume = vi.spyOn(response, "resume");
    await expect(readMetadataResponse(response, vi.fn())).rejects.toThrow("redirects");
    expect(resume).toHaveBeenCalledOnce();
  });

  it("aborts metadata larger than 64 KiB", async () => {
    const abort = vi.fn();
    await expect(
      readMetadataResponse(metadataResponse(200, [Buffer.alloc(65 * 1024)]), abort),
    ).rejects.toThrow("too large");
    expect(abort).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("too large") }),
    );
  });
});
