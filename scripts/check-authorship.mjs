import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const providerNames = ["codex", "claude", "openai", "anthropic"].join("|");
const forbidden = [
  new RegExp(`${["co", "authored", "by"].join("[-\\s]*")}\\s*:`, "i"),
  new RegExp(`${["generated", "by"].join("[-\\s]+")}\\s*:?\\s*(?:${providerNames})`, "i"),
  new RegExp(`(?:built|created|developed|produced)\\s+(?:by|with)\\s+(?:${providerNames})`, "i"),
  new RegExp(
    `(?:${providerNames})\\s+(?:is|as)\\s+(?:an?\\s+)?(?:author|co-author|coproducer|co-producer)`,
    "i",
  ),
];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function findViolation(label, value) {
  for (const pattern of forbidden) {
    if (pattern.test(value)) {
      return `${label}: matched ${pattern}`;
    }
  }
  return undefined;
}

const violations = [];
const messageFileIndex = process.argv.indexOf("--message-file");

if (messageFileIndex !== -1) {
  const messagePath = process.argv[messageFileIndex + 1];
  if (!messagePath) throw new Error("--message-file requires a path");
  const violation = findViolation("pending commit message", readFileSync(messagePath, "utf8"));
  if (violation) violations.push(violation);
}

let files = [];
try {
  files = git(["ls-files", "--cached", "--others", "--exclude-standard"])
    .split(/\r?\n/u)
    .filter(Boolean);
} catch {
  // A source archive without .git can still run the message-only check.
}

for (const file of files) {
  if (file === "scripts/check-authorship.mjs") continue;
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (content.includes("\0")) continue;
  const violation = findViolation(file, content);
  if (violation) violations.push(violation);
}

try {
  const history = git(["log", "--format=%H%x09%an%x09%B%x00"]);
  for (const record of history.split("\0")) {
    if (!record.trim()) continue;
    const [commit, author = "", ...messageParts] = record.split("\t");
    // "Thales Holleben" is the owner's GitHub display name, which GitHub stamps on the
    // synthetic pull-request merge commit that CI checks out.
    if (!["thalesholleben", "Thales Holleben", "Thales Gomes"].includes(author.trim())) {
      violations.push(`${commit}: unexpected public author ${JSON.stringify(author.trim())}`);
    }
    const violation = findViolation(`${commit} commit message`, messageParts.join("\t"));
    if (violation) violations.push(violation);
  }
} catch {
  // No commit exists yet in the Gate 1 repository.
}

if (violations.length > 0) {
  process.stderr.write(
    `Authorship policy failed:\n${violations.map((item) => `- ${item}`).join("\n")}\n`,
  );
  process.exit(1);
}

process.stdout.write("Authorship policy passed.\n");
