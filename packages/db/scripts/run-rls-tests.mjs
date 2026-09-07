import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const composeArguments = ["compose", "-f", "compose.yaml", "-p", "backlog-syntax-db-test"];

function run(argumentsList, options = {}) {
  return spawnSync("docker", argumentsList, {
    cwd: packageDirectory,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
}

const dockerCheck = run(["info"], { capture: true });
if (dockerCheck.status !== 0) {
  process.stderr.write(dockerCheck.stderr || "Docker Desktop is unavailable.\n");
  process.exit(1);
}

let exitCode = 1;
try {
  const result = run([
    ...composeArguments,
    "up",
    "--abort-on-container-exit",
    "--exit-code-from",
    "rls-test",
    "--renew-anon-volumes",
  ]);
  exitCode = result.status ?? 1;
} finally {
  const teardown = run([...composeArguments, "down", "--volumes", "--remove-orphans"]);
  if (teardown.status !== 0) {
    exitCode = teardown.status ?? 1;
  }
}

process.exit(exitCode);
