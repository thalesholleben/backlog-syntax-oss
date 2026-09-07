import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

import { cimd } from "@better-auth/cimd";
import { mcp, requireMcpAuth } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";

const CIMD_TIMEOUT_MS = 5_000;
const CIMD_MAX_BYTES = 64 * 1024;

export function assertPublicMetadataUrl(value) {
  const url = new URL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    isIP(hostname) !== 0 ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error("CIMD client metadata URL must use a public HTTPS hostname");
  }
  return { url, hostname };
}

export function isPublicAddress(address, family) {
  if (family === 4) {
    const parts = address.split(".").map(Number);
    const [first, second] = parts;
    if (
      isIP(address) !== 4 ||
      parts.length !== 4 ||
      parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    ) {
      return false;
    }
    return !(
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 0 && parts[2] === 0) ||
      (first === 192 && second === 0 && parts[2] === 2) ||
      (first === 192 && second === 168) ||
      (first === 192 && second === 88 && parts[2] === 99) ||
      (first === 198 && (second === 18 || second === 19)) ||
      (first === 198 && second === 51 && parts[2] === 100) ||
      (first === 203 && second === 0 && parts[2] === 113) ||
      (first === 100 && second >= 64 && second <= 127) ||
      first >= 224
    );
  }
  if (family !== 6 || isIP(address) !== 6 || address.includes("%")) return false;

  const words = parseIpv6(address);
  if (!words) return false;

  const isIpv4Mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  if (isIpv4Mapped) {
    return isPublicAddress(
      `${words[6] >> 8}.${words[6] & 0xff}.${words[7] >> 8}.${words[7] & 0xff}`,
      4,
    );
  }

  // Only global unicast (2000::/3) is eligible. Exclude IETF protocol assignments,
  // documentation and transition prefixes that are not ordinary globally routed hosts.
  return !(
    words[0] < 0x2000 ||
    words[0] > 0x3fff ||
    (words[0] === 0x2001 && words[1] <= 0x01ff) ||
    (words[0] === 0x2001 && words[1] === 0x0db8) ||
    words[0] === 0x2002 ||
    words[0] === 0x3ffe ||
    (words[0] === 0x3fff && words[1] <= 0x0fff)
  );
}

function parseIpv6(address) {
  let normalized = address.toLowerCase();
  if (normalized.includes(".")) {
    const separator = normalized.lastIndexOf(":");
    const ipv4 = normalized
      .slice(separator + 1)
      .split(".")
      .map(Number);
    if (
      separator < 0 ||
      ipv4.length !== 4 ||
      ipv4.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    ) {
      return null;
    }
    normalized = `${normalized.slice(0, separator)}:${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const omitted = 8 - left.length - right.length;
  if ((halves.length === 1 && omitted !== 0) || (halves.length === 2 && omitted < 1)) return null;
  const words = [...left, ...Array.from({ length: omitted }, () => "0"), ...right];
  if (words.length !== 8 || words.some((word) => !/^[0-9a-f]{1,4}$/.test(word))) return null;
  return words.map((word) => Number.parseInt(word, 16));
}

export async function resolvePublicAddresses(
  hostname,
  resolver = lookup,
  timeoutMs = CIMD_TIMEOUT_MS,
) {
  let timeout;
  try {
    const addresses = await Promise.race([
      resolver(hostname, { all: true, verbatim: true }),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("CIMD client metadata DNS resolution timed out")),
          timeoutMs,
        );
      }),
    ]);
    if (
      addresses.length === 0 ||
      addresses.some(({ address, family }) => !isPublicAddress(address, family))
    ) {
      throw new Error("CIMD client metadata hostname must resolve only to public addresses");
    }
    return addresses;
  } finally {
    clearTimeout(timeout);
  }
}

export function readMetadataResponse(response, abortRequest) {
  return new Promise((resolve, reject) => {
    if ((response.statusCode ?? 500) >= 300 && (response.statusCode ?? 500) < 400) {
      response.resume();
      reject(new Error("CIMD client metadata redirects are not allowed"));
      return;
    }
    const chunks = [];
    let size = 0;
    let rejectedForSize = false;
    response.on("data", (chunk) => {
      size += chunk.length;
      if (size > CIMD_MAX_BYTES) {
        if (rejectedForSize) return;
        rejectedForSize = true;
        const error = new Error("CIMD metadata document is too large");
        abortRequest(error);
        reject(error);
        return;
      }
      chunks.push(chunk);
    });
    response.on("error", reject);
    response.on("end", () => {
      if (rejectedForSize) return;
      resolve(
        new Response(Buffer.concat(chunks), {
          status: response.statusCode ?? 502,
          headers: { "content-type": response.headers["content-type"] ?? "application/json" },
        }),
      );
    });
  });
}

export async function fetchClientMetadataResource(input) {
  const rawUrl = input instanceof Request ? input.url : input.toString();
  const { url, hostname } = assertPublicMetadataUrl(rawUrl);
  const addresses = await resolvePublicAddresses(hostname);
  const pinned = addresses[0];
  if (!pinned) throw new Error("CIMD client metadata hostname did not resolve");

  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      {
        protocol: "https:",
        hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: { accept: "application/json", host: hostname },
        servername: hostname,
        lookup(_hostname, options, callback) {
          // Node's autoSelectFamily requests every candidate. Never resolve DNS again.
          if (options?.all) {
            callback(null, addresses);
          } else {
            callback(null, pinned.address, pinned.family);
          }
        },
      },
      (response) => {
        readMetadataResponse(response, (error) => request.destroy(error)).then(resolve, reject);
      },
    );
    request.setTimeout(CIMD_TIMEOUT_MS, () =>
      request.destroy(new Error("CIMD metadata request timed out")),
    );
    request.on("error", reject);
    request.end();
  });
}

export function createProductAuth(pool, config, options = {}) {
  const resource = `${config.PUBLIC_API_URL}/mcp`;
  const secureCookies = new URL(config.PUBLIC_API_URL).protocol === "https:";

  return betterAuth({
    appName: "Backlog Syntax",
    baseURL: config.PUBLIC_API_URL,
    secret: config.AUTH_SECRET,
    database: pool,
    trustedOrigins: [config.WEB_ORIGIN],
    advanced: {
      cookiePrefix: "backlog",
      // The session cookie has an explicit operator-controlled name. Enabling Better Auth's
      // automatic secure prefix would turn `__Host-backlog_session` into an invalid double prefix.
      useSecureCookies: false,
      database: { generateId: "uuid" },
      defaultCookieAttributes: {
        secure: secureCookies,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        session_token: {
          name: config.SESSION_COOKIE_NAME,
          attributes: { secure: secureCookies, httpOnly: true, sameSite: "lax", path: "/" },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      resetPasswordTokenExpiresIn: 3_600,
      ...(options.sendResetPassword ? { sendResetPassword: options.sendResetPassword } : {}),
    },
    user: {
      additionalFields: {
        termsAcceptedAt: { type: "date", required: false, input: true },
        privacyNoticeAcceptedAt: { type: "date", required: false, input: true },
        legalNoticeVersion: { type: "string", required: false, input: true },
      },
    },
    ...(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET
      ? {
          socialProviders: {
            google: {
              clientId: config.GOOGLE_CLIENT_ID,
              clientSecret: config.GOOGLE_CLIENT_SECRET,
            },
          },
        }
      : {}),
    ...(!options.sendResetPassword
      ? { disabledPaths: ["/request-password-reset", "/reset-password"] }
      : {}),
    plugins: [
      jwt(),
      mcp({
        loginPage: `${config.WEB_ORIGIN}/entrar`,
        consentPage: `${config.WEB_ORIGIN}/consent`,
        resource,
        scopes: ["openid", "profile", "email", "offline_access", "read", "write"],
      }),
      cimd({
        fetchClientMetadataResource:
          options.fetchClientMetadataResource ?? fetchClientMetadataResource,
        metadataProfile: "mcp-2026-07-28",
      }),
    ],
  });
}

function withoutCredentials(request) {
  const headers = new Headers(request.headers);
  headers.delete("authorization");
  headers.delete("cookie");
  return new Request(request, { headers });
}

function authInfoFromClaims(claims, resource) {
  if (typeof claims.sub !== "string") throw new Error("Verified OAuth token has no subject");
  const scopes = typeof claims.scope === "string" ? claims.scope.split(" ").filter(Boolean) : [];
  const principalScopes = scopes.filter((scope) => ["read", "write", "admin"].includes(scope));
  return {
    token: "verified-token-redacted",
    clientId: typeof claims.client_id === "string" ? claims.client_id : claims.sub,
    scopes,
    ...(typeof claims.exp === "number" ? { expiresAt: claims.exp } : {}),
    resource: new URL(resource),
    extra: {
      principal: {
        subjectType: "user",
        subjectId: claims.sub,
        scopes: principalScopes,
        authentication: "oauth",
      },
    },
  };
}

export function createProtectedProductMcpEndpoint(auth, config, transport) {
  const issuer = `${config.PUBLIC_API_URL}/api/auth`;
  const resource = `${config.PUBLIC_API_URL}/mcp`;
  return requireMcpAuth(
    auth,
    (request, claims) =>
      transport.fetch(withoutCredentials(request), {
        authInfo: authInfoFromClaims(claims, resource),
      }),
    {
      issuer,
      resource,
      jwksUrl: `${issuer}/jwks`,
      requiredScopes: ["read"],
      challengeScopes: ["read"],
    },
  );
}
