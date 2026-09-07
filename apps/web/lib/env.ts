import { z } from "zod";

/**
 * Next.js only inlines `NEXT_PUBLIC_*` variables into the browser bundle, so the web app
 * mirrors the API's `PUBLIC_API_URL` under that prefix instead of reusing the bare name.
 */
const EnvironmentSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const env = EnvironmentSchema.parse({
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    (process.env.NODE_ENV === "production" ? undefined : "http://localhost:8787"),
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED,
});
