import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The skills document this service's own contracts, so they can go stale the moment a
// route or a tool changes. These checks exist to make that failure loud in the same pull
// request that changes the contract, which is the whole reason the packages live here
// instead of in a repository of their own.

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const claudeCode = join(repository, "skills", "claude-code", "skills", "backlog-cloud");
const codex = join(repository, "skills", "codex", "backlog-cloud");
const failures = [];

function read(path) {
  return readFileSync(path, "utf8").replace(/\r\n/gu, "\n");
}

function digest(path) {
  return createHash("sha256").update(read(path)).digest("hex");
}

for (const path of [
  join(claudeCode, "SKILL.md"),
  join(codex, "SKILL.md"),
  join(repository, ".claude-plugin", "marketplace.json"),
  join(repository, "skills", "claude-code", ".claude-plugin", "plugin.json"),
]) {
  if (!existsSync(path)) failures.push(`missing ${path}`);
}

// setup.md is deliberately different: connecting differs per client. The transport
// references are one text and must stay byte-identical across both variants.
for (const shared of ["references/api.md", "references/mcp.md", "references/monitors.md"]) {
  const left = join(claudeCode, shared);
  const right = join(codex, shared);
  if (!existsSync(left) || !existsSync(right)) {
    failures.push(`missing shared reference ${shared}`);
    continue;
  }
  if (digest(left) !== digest(right)) {
    failures.push(`${shared} differs between the Claude Code and Codex packages`);
  }
}

// The marketplace entry must point at a real plugin, and both must name the same plugin,
// or the install command in the README silently resolves to nothing.
if (existsSync(join(repository, ".claude-plugin", "marketplace.json"))) {
  const marketplace = JSON.parse(read(join(repository, ".claude-plugin", "marketplace.json")));
  for (const plugin of marketplace.plugins ?? []) {
    const source = join(repository, plugin.source ?? "");
    const manifest = join(source, ".claude-plugin", "plugin.json");
    if (!existsSync(manifest)) {
      failures.push(`marketplace plugin ${plugin.name} has no manifest at ${manifest}`);
      continue;
    }
    const declared = JSON.parse(read(manifest)).name;
    if (declared !== plugin.name) {
      failures.push(
        `marketplace calls the plugin ${plugin.name} but its manifest says ${declared}`,
      );
    }
  }
}

// Every REST route the skill teaches has to exist in the published OpenAPI. Examples
// abbreviate the identifiers, so normalize them back to the templated form first.
const openapiPath = join(repository, "openapi", "openapi.json");
if (existsSync(openapiPath) && existsSync(join(codex, "references/api.md"))) {
  const paths = JSON.parse(read(openapiPath)).paths ?? {};
  const text = read(join(codex, "references/api.md"));
  const cited = new Set();
  for (const [, method, route] of text.matchAll(
    /\b(GET|POST|PATCH|PUT|DELETE) (\/v1[A-Za-z0-9/_{}.-]*)/gu,
  )) {
    const normalized = route
      .replace(/\/workspaces\/(?!\{)[A-Za-z0-9_-]+/u, "/workspaces/{workspaceId}")
      .replace(/\/tasks\/(?!\{)[A-Za-z0-9_-]+/u, "/tasks/{taskId}")
      .replace(/\/projects\/(?!\{)[A-Za-z0-9_-]+/u, "/projects/{projectId}");
    cited.add(`${method} ${normalized}`);
  }
  if (cited.size === 0) failures.push("no REST route found in references/api.md");
  for (const entry of [...cited].sort()) {
    const [method, route] = entry.split(" ");
    if (!paths[route]) {
      failures.push(`api.md documents ${entry}, absent from the OpenAPI`);
    } else if (!paths[route][method.toLowerCase()]) {
      failures.push(`api.md documents ${entry}, but the OpenAPI has no ${method} for that path`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`Skill packages failed:\n${failures.map((i) => `- ${i}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write("Skill packages passed.\n");
