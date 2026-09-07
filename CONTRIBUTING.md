# Contributing to Backlog Syntax

Thanks for helping make human-agent coordination safer and easier to self-host.

## Before opening work

1. Search existing issues and discussions.
2. Use an issue form for bugs or feature proposals.
3. For architecture or security-boundary changes, describe the threat model and migration impact first.
4. Never open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md).

## Required branch and PR workflow

All new work, including README, documentation, fixes and hotfixes, must use a separate
branch and a pull request into `main`. Do not commit or push directly to `main`.
The documentation-only update authorized on 2026-09-06 was the final explicit exception.

With a clean working tree, start from the current remote baseline:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c docs/short-description
```

Use a descriptive prefix such as `feat/`, `fix/`, `docs/` or `chore/`. If there are
existing changes, inspect both `git diff` and `git diff --cached` first. Preserve
them on a separate branch without resetting, stashing or committing unrelated work.
Do not run the clean-tree sequence blindly over someone else's changes.

Stage only the intended files, inspect the staged diff, commit on the branch, then:

```bash
git push -u origin docs/short-description
gh pr create --base main --head docs/short-description
```

Use the pull-request template. Let the required checks finish and obtain the owner's
approval before merging. Creating a PR does not authorize a merge or production deploy.
This is a repository workflow rule; it does not claim that GitHub branch protection
or a server-side ruleset has been configured.

## Local checks

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm docker:test
```

Run the smallest relevant command while working. Code changes require the full checks
before review; documentation-only changes require link/path checks, `git diff --check`
and `pnpm authorship:check`, with CI still running as configured. Do not claim a runtime
test for a docs-only change. Stop local Next.js processes before commands that build
into the same `.next` directory. Tests that exercise RLS must connect as `backlog_app`,
never as the database owner. See the [local runbook](docs/runbooks/local-development.md).

## Pull requests

- Keep one coherent change per pull request.
- Explain behavior, risk, validation, and documentation changes.
- Add or update a runnable test for non-trivial logic.
- Update the relevant ADR, feature document, API contract, or runbook.
- Do not include credentials, personal data, production exports, or generated runtime secrets.
- Do not add authorship trailers or production credits for automation tools.

By contributing, you agree that your contribution is licensed under the repository's MIT license.
