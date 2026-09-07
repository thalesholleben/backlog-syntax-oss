# Authorship check

## Objective

Keep public project authorship and repository credits under `thalesholleben`.

## Steps

```bash
pnpm authorship:check
git config core.hooksPath .githooks
```

The script inspects staged and repository text plus reachable commit messages. The commit hook runs the same guard with the pending commit-message file. CI repeats the check independently.

## Expected result

The command exits with status zero and prints that the authorship policy passed.

## Troubleshooting

The accepted commit author names are `thalesholleben`, `Thales Holleben` and `Thales Gomes`.
The first two are the owner's GitHub login and display name; GitHub stamps the display name on
the synthetic pull-request merge commit that CI checks out, so a pull request fails without it
even when the branch head passes.

Remove prohibited authorship trailers or production credits. Technical references in architecture, compatibility, security, or contributor instructions are allowed when they do not represent authorship.
