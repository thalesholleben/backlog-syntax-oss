import path from "node:path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const localApiOrigin = "http://localhost:8787";

export default function nextConfig(phase: string): NextConfig {
  const isDevelopment = phase === PHASE_DEVELOPMENT_SERVER;
  const apiOrigin =
    process.env.NEXT_PUBLIC_API_URL?.trim() || (isDevelopment ? localApiOrigin : "");
  if (!apiOrigin) {
    throw new Error("NEXT_PUBLIC_API_URL is required for a production build.");
  }
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "img-src 'self' data:",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self'",
  ].join("; ");

  return {
    output: "standalone",
    // Preserve the listener origin for internal rewrites, including loopback IPv4 hosts.
    skipProxyUrlNormalize: true,
    outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
    poweredByHeader: false,
    reactStrictMode: true,
    ...(isDevelopment ? { allowedDevOrigins: ["127.0.0.1"] } : {}),
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "Content-Security-Policy", value: contentSecurityPolicy },
            { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
            { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            ...(isDevelopment
              ? []
              : [
                  {
                    key: "Strict-Transport-Security",
                    value: "max-age=31536000; includeSubDomains",
                  },
                ]),
          ],
        },
      ];
    },
  };
}
