import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Each client reads skills from its own directory, and the Claude Code copy lives one
// level deeper because that variant is also shippable as a plugin.
const clients = {
  "claude-code": {
    source: join(repository, "skills", "claude-code", "skills", "backlog-cloud"),
    user: join(homedir(), ".claude", "skills", "backlog-cloud"),
    project: join(process.cwd(), ".claude", "skills", "backlog-cloud"),
    invocation: "/backlog-cloud",
  },
  codex: {
    source: join(repository, "skills", "codex", "backlog-cloud"),
    user: join(homedir(), ".agents", "skills", "backlog-cloud"),
    project: join(process.cwd(), ".agents", "skills", "backlog-cloud"),
    invocation: "$backlog-cloud",
  },
};

const args = process.argv.slice(2);
const name = args.find((argument) => !argument.startsWith("--"));
const scope = args.includes("--project") ? "project" : "user";
const force = args.includes("--force");
const client = clients[name];

if (!client) {
  process.stderr.write(
    [
      "Usage: node scripts/install-skill.mjs <claude-code|codex> [--project] [--force]",
      "",
      "  --project  install into the current directory instead of your home directory",
      "  --force    replace an existing installation",
      "",
      "Installing the skill does not connect the service. Follow references/setup.md",
      "in the installed folder to add the MCP server or a service-account token.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

if (!existsSync(client.source)) {
  process.stderr.write(`Missing skill source: ${client.source}\n`);
  process.exit(1);
}

const target = client[scope];
if (existsSync(target) && !force) {
  process.stderr.write(
    `${target} already exists. Review the differences, then re-run with --force to replace it.\n`,
  );
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
cpSync(client.source, target, { recursive: true, force: true });

const installed = readdirSync(target, { recursive: true, withFileTypes: true }).filter((entry) =>
  entry.isFile(),
).length;
process.stdout.write(
  [
    `Installed ${installed} files into ${target}`,
    `Restart ${name} and invoke it with ${client.invocation}.`,
    "The skill only describes how to use the service. Connect it first:",
    `see ${join(target, "references", "setup.md")}`,
    "",
  ].join("\n"),
);
