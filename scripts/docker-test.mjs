import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryDirectory = fileURLToPath(new URL("..", import.meta.url));
const composeArguments = [
  "compose",
  "--project-name",
  "backlog-syntax-v1",
  "--file",
  "compose.yaml",
  "--file",
  "compose.test.yaml",
];
const postgresHostPort = process.env["POSTGRES_HOST_PORT"] ?? "55439";
const apiHostPort = process.env["API_HOST_PORT"] ?? "8789";
const webHostPort = process.env["WEB_HOST_PORT"] ?? "3009";
const skipBuild = process.env["DOCKER_SKIP_BUILD"] === "true";
const composeEnvironment = {
  ...process.env,
  POSTGRES_HOST_PORT: postgresHostPort,
  API_HOST_PORT: apiHostPort,
  WEB_HOST_PORT: webHostPort,
  POSTGRES_SUPERUSER_PASSWORD: "test-postgres-only",
  BACKLOG_OWNER_PASSWORD: "test-owner-only",
  BACKLOG_AUTH_PASSWORD: "test-auth-only",
  BACKLOG_APP_PASSWORD: "test-app-only",
  AUTH_SECRET: "docker-test-secret-at-least-thirty-two-characters",
  WEB_ORIGIN: `http://127.0.0.1:${webHostPort}`,
  PUBLIC_API_URL: `http://127.0.0.1:${apiHostPort}`,
  SESSION_COOKIE_NAME: "backlog_session",
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: "false",
};

function run(argumentsList, { capture = false } = {}) {
  const result = spawnSync("docker", argumentsList, {
    cwd: repositoryDirectory,
    encoding: "utf8",
    env: composeEnvironment,
    stdio: capture ? "pipe" : "inherit",
    timeout: 10 * 60_000,
  });

  if (result.status !== 0) {
    if (capture) process.stderr.write(result.stderr || "Docker command failed.\n");
    throw new Error(`docker ${argumentsList[0] ?? "command"} failed`);
  }

  return result.stdout?.trim() ?? "";
}

function runLocal(command, argumentsList, environment) {
  const executable = process.platform === "win32" ? "cmd.exe" : command;
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", [command, ...argumentsList].join(" ")]
      : argumentsList;
  const result = spawnSync(executable, args, {
    cwd: repositoryDirectory,
    env: environment,
    stdio: "inherit",
    timeout: 5 * 60_000,
  });
  if (result.status !== 0) throw new Error(`${command} integration command failed`);
}

async function readJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

run(["info"], { capture: true });
process.stdout.write("docker=available\n");

let failure;
try {
  run([...composeArguments, "down", "--volumes", "--remove-orphans"]);
  run([
    ...composeArguments,
    "up",
    ...(skipBuild ? [] : ["--build"]),
    "--detach",
    "--wait",
    "--wait-timeout",
    "180",
  ]);

  const health = await readJson(`http://127.0.0.1:${apiHostPort}/health`);
  const readiness = await readJson(`http://127.0.0.1:${apiHostPort}/ready`);
  const webHealth = await readJson(`http://127.0.0.1:${webHostPort}/api/health`);
  if (health.status !== "ok") throw new Error("Unexpected liveness payload");
  if (readiness.status !== "ready") throw new Error("Unexpected readiness payload");
  if (webHealth.status !== "ok") throw new Error("Unexpected web liveness payload");
  process.stdout.write(
    `health=${health.status}\nready=${readiness.status}\nweb=${webHealth.status}\n`,
  );

  const databaseContainerId = run([...composeArguments, "ps", "--quiet", "db"], {
    capture: true,
  });
  const databaseInit = run(
    [
      "exec",
      databaseContainerId,
      "sh",
      "-c",
      'test -f "$PGDATA/.backlog-init-complete" && echo complete',
    ],
    { capture: true },
  );
  if (databaseInit !== "complete") throw new Error("Database initialization sentinel is missing");
  process.stdout.write("database_init=complete\n");

  const containerId = run([...composeArguments, "ps", "--quiet", "api"], { capture: true });
  if (!containerId) throw new Error("API container was not found");
  const configuredUser = run(["inspect", "--format", "{{.Config.User}}", containerId], {
    capture: true,
  });
  if (!configuredUser || configuredUser === "0" || configuredUser === "root") {
    throw new Error("API container is configured to run as root");
  }
  process.stdout.write(`container_user=${configuredUser}\n`);
  const apiRestartCount = run(["inspect", "--format", "{{.RestartCount}}", containerId], {
    capture: true,
  });
  if (apiRestartCount !== "0") throw new Error(`API restarted ${apiRestartCount} time(s)`);
  process.stdout.write("api_restart_count=0\n");

  const webContainerId = run([...composeArguments, "ps", "--quiet", "web"], { capture: true });
  const webConfiguredUser = run(["inspect", "--format", "{{.Config.User}}", webContainerId], {
    capture: true,
  });
  if (!webConfiguredUser || webConfiguredUser === "0" || webConfiguredUser === "root") {
    throw new Error("Web container is configured to run as root");
  }
  process.stdout.write(`web_container_user=${webConfiguredUser}\n`);

  runLocal(
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
      INTEGRATION_AUTH_SECRET: composeEnvironment.AUTH_SECRET,
      INTEGRATION_AUTH_DATABASE_URL: `postgresql://backlog_auth:test-auth-only@127.0.0.1:${postgresHostPort}/backlog_syntax`,
      INTEGRATION_APP_DATABASE_URL: `postgresql://backlog_app:test-app-only@127.0.0.1:${postgresHostPort}/backlog_syntax`,
    },
  );
  process.stdout.write("product_integration=ok\n");
  runLocal(
    "pnpm",
    ["--filter", "@backlog-syntax/web", "exec", "playwright", "test", "--workers=1"],
    {
      ...process.env,
      RUN_REAL_STACK: "true",
      WEB_E2E_BASE_URL: `http://127.0.0.1:${webHostPort}`,
      PUBLIC_WEB_URL: `http://127.0.0.1:${webHostPort}`,
      NEXT_PUBLIC_API_URL: `http://127.0.0.1:${apiHostPort}`,
    },
  );
  process.stdout.write("browser_integration=ok\n");
} catch (error) {
  failure = error;
} finally {
  try {
    run([...composeArguments, "down", "--volumes", "--remove-orphans"]);
    process.stdout.write("teardown=ok\n");
  } catch (teardownError) {
    failure ??= teardownError;
  }
}

if (failure) throw failure;
