# Agent skills for Backlog Syntax

**An agent will not use Backlog Syntax until one of these is installed.** Creating an
account and connecting the MCP server gives the agent the tools; the skill is what tells it
when to reach for them, which workspace to write to, how to avoid duplicating a task, and
that recording a task never authorizes executing it. Without the skill, a connected agent
usually ignores the service or guesses a workspace id.

Two packages, one for each client. Pick the one you use; there is no reason to install both.

| Client | Package | Invocation |
| --- | --- | --- |
| Claude Code | [`claude-code/`](claude-code/skills/backlog-cloud/SKILL.md) | `/backlog-cloud <request>` |
| Codex | [`codex/`](codex/backlog-cloud/SKILL.md) | `$backlog-cloud <request>` |

## Install

### Claude Code, from this repository as a plugin

No clone. In Claude Code:

```
/plugin marketplace add thalesholleben/backlog-syntax-oss
/plugin install backlog-cloud@backlog-syntax
```

### Either client, from a clone

```bash
git clone --depth 1 https://github.com/thalesholleben/backlog-syntax-oss.git
cd backlog-syntax-oss
node scripts/install-skill.mjs claude-code   # or: codex
```

It installs for your user, into `~/.claude/skills/backlog-cloud` or
`~/.agents/skills/backlog-cloud`. Add `--project` to install into the current directory
instead, when only one project should use the service. It refuses to overwrite an existing
installation unless you pass `--force`, so an edited copy is never lost silently. No
dependency install is needed for this script.

### By hand

Copy the whole `backlog-cloud` folder of your variant into one of these:

| Client | Only this project | Your user |
| --- | --- | --- |
| Claude Code | `.claude/skills/backlog-cloud/` | `~/.claude/skills/backlog-cloud/` |
| Codex | `.agents/skills/backlog-cloud/` | `~/.agents/skills/backlog-cloud/` |

## Then connect the service

Installing the skill does not connect anything, and the skill deliberately does not connect
it for you: a request to look something up must never install software. Follow
`references/setup.md` inside the package you installed. In short, the remote MCP server at
`https://backlog-api.syntaxlab.com.br/mcp` with OAuth, or a service-account token against
the REST API for scripts and for telling concurrent agents apart.

If no connection is usable, the skill reports that the task **was not saved** and says which
access is missing. It never writes a local substitute backlog or claims a save that did not
happen.

## What the skill teaches

- Selecting workspace and project by the ids the service returns, never by guessing from a
  folder name, slug or domain.
- Searching for a duplicate before creating a task, and updating the existing card instead.
- Scheduling, deadlines, blocking with a reason, and completing with evidence.
- Reserving work with a lease, extending it, releasing it and handing it over.
- Optimistic concurrency, pagination, idempotency and what to do when a write times out and
  the outcome is unknown.

Recording a pending item does not start it. Small, reversible, already-authorized fixes are
resolved in the current work rather than turned into tasks.

## Keeping these honest

These packages document this service's own contracts, which is why they live in the product
repository rather than in one of their own: a change to a route or a tool and the skill
update are the same pull request. `pnpm skills:check` runs in CI and fails when

- `references/api.md` or `references/mcp.md` stop being byte-identical across the two
  variants (`setup.md` differs on purpose, because connecting differs per client);
- a REST route or method in `api.md` is absent from `openapi/openapi.json`;
- the marketplace entry and the plugin manifest disagree, or point at nothing.

If you extend the service, update the reference and let the gate confirm it. The published
OpenAPI and the connected MCP catalog always win over this text.
