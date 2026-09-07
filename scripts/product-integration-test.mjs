import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryDirectory = fileURLToPath(new URL("..", import.meta.url));
const project = "backlog-syntax-product-integration";
const postgresPort = process.env["POSTGRES_HOST_PORT"] ?? "55439";
const composeEnvironment = {
  ...process.env,
  POSTGRES_HOST_PORT: postgresPort,
  POSTGRES_SUPERUSER_PASSWORD: "test-postgres-only",
  BACKLOG_OWNER_PASSWORD: "test-owner-only",
  BACKLOG_AUTH_PASSWORD: "test-auth-only",
  BACKLOG_APP_PASSWORD: "test-app-only",
  AUTH_SECRET: "integration-secret-at-least-thirty-two-characters",
  WEB_ORIGIN: "https://web.integration.test",
  PUBLIC_API_URL: "https://api.integration.test",
};

function run(command, args, environment = composeEnvironment) {
  const executable = process.platform === "win32" ? "cmd.exe" : command;
  const executableArgs =
    process.platform === "win32" ? ["/d", "/s", "/c", [command, ...args].join(" ")] : args;
  const result = spawnSync(executable, executableArgs, {
    cwd: repositoryDirectory,
    env: environment,
    stdio: "inherit",
    timeout: 5 * 60_000,
  });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

const compose = (...args) =>
  run("docker", [
    "compose",
    "--project-name",
    project,
    "--file",
    "compose.yaml",
    "--file",
    "compose.test.yaml",
    ...args,
  ]);
let failure;

try {
  compose("down", "--volumes", "--remove-orphans");
  compose("up", "--detach", "--wait", "--wait-timeout", "90", "db");
  run(
    "pnpm",
    [
      "--filter",
      "@backlog-syntax/api",
      "exec",
      "vitest",
      "run",
      "test/product.integration.test.ts",
    ],
    {
      ...process.env,
      RUN_PRODUCT_INTEGRATION: "true",
      INTEGRATION_AUTH_DATABASE_URL: `postgresql://backlog_auth:test-auth-only@127.0.0.1:${postgresPort}/backlog_syntax`,
      INTEGRATION_APP_DATABASE_URL: `postgresql://backlog_app:test-app-only@127.0.0.1:${postgresPort}/backlog_syntax`,
    },
  );
  process.stdout.write("product_integration=ok\n");
} catch (error) {
  failure = error;
} finally {
  try {
    compose("down", "--volumes", "--remove-orphans");
    process.stdout.write("teardown=ok\n");
  } catch (teardownError) {
    failure ??= teardownError;
  }
}

if (failure) throw failure;
