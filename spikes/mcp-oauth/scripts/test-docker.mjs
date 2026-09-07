import { spawnSync } from "node:child_process";

const databaseUrl =
  "postgresql://backlog_test:local_ephemeral_only@127.0.0.1:55432/backlog_syntax_oauth_test";
function run(command, args, env = process.env) {
  const executable = process.platform === "win32" ? "cmd.exe" : command;
  const executableArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", [command, ...args].join(" ")]
      : args;
  const result = spawnSync(executable, executableArgs, {
    cwd: new URL("..", import.meta.url),
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  return result.status === 0;
}

run("docker", ["compose", "down", "-v", "--remove-orphans"]);

try {
  if (!run("pnpm", ["probe:node"])) process.exit(1);
  if (!run("docker", ["compose", "up", "-d", "--wait"])) process.exit(1);
  const env = { ...process.env, DATABASE_URL: databaseUrl };
  if (!run("pnpm", ["typecheck"], env)) process.exitCode = 1;
  else if (!run("pnpm", ["test:evidence"], env)) process.exitCode = 1;
} finally {
  if (!run("docker", ["compose", "down", "-v", "--remove-orphans"])) {
    process.exitCode = 1;
  }
}
