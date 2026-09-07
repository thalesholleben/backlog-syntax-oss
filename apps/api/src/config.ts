import { z } from "zod";

const BooleanStringSchema = z.enum(["true", "false"]).transform((value) => value === "true");
const OptionalNonEmptyStringSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const EnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_HOST: z.string().min(1).default("127.0.0.1"),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(8787),
    WEB_ORIGIN: z.url().default("http://localhost:3000"),
    PUBLIC_API_URL: z.url().default("http://localhost:8787"),
    AUTH_SECRET: z.string().min(32),
    SESSION_COOKIE_NAME: z
      .string()
      .regex(/^(?:__Host-)?[A-Za-z0-9_-]+$/)
      .default("__Host-backlog_session"),
    GOOGLE_CLIENT_ID: OptionalNonEmptyStringSchema,
    GOOGLE_CLIENT_SECRET: OptionalNonEmptyStringSchema,
    AUTH_DATABASE_URL: z.url(),
    APP_DATABASE_URL: z.url(),
    DATABASE_SSL: BooleanStringSchema.default(false),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
    DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(100).max(30_000).default(3_000),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(5_000),
    ALLOW_TEST_PRINCIPAL: BooleanStringSchema.default(false),
    HOUSEKEEPING_ENABLED: BooleanStringSchema.default(true),
    HOUSEKEEPING_INTERVAL_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(60_000),
  })
  .refine((config) => config.NODE_ENV !== "production" || !config.ALLOW_TEST_PRINCIPAL, {
    message: "ALLOW_TEST_PRINCIPAL must be false in production",
    path: ["ALLOW_TEST_PRINCIPAL"],
  })
  .refine((config) => Boolean(config.GOOGLE_CLIENT_ID) === Boolean(config.GOOGLE_CLIENT_SECRET), {
    message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together",
    path: ["GOOGLE_CLIENT_ID"],
  })
  .refine(
    (config) =>
      config.NODE_ENV !== "production" ||
      (new URL(config.PUBLIC_API_URL).protocol === "https:" &&
        new URL(config.WEB_ORIGIN).protocol === "https:" &&
        config.SESSION_COOKIE_NAME.startsWith("__Host-")),
    {
      message: "Production origins must use HTTPS and the session cookie must use __Host-",
      path: ["SESSION_COOKIE_NAME"],
    },
  );

export type ApiConfig = z.infer<typeof EnvironmentSchema>;

export function parseConfig(environment: NodeJS.ProcessEnv): ApiConfig {
  return EnvironmentSchema.parse(environment);
}
