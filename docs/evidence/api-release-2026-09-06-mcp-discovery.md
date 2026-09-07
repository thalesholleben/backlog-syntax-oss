# API release 2026-09-06: MCP workspace discovery

Second release under the branch + PR workflow. Ships the `list_workspaces` MCP tool so a
newly connected client can discover its authorized workspace IDs.

## Approved change

| Item | Value |
| --- | --- |
| Pull requests | #8 (`fix/mcp-workspace-discovery`), merged `c65bc4363ef6433b523e68b1154f97afe91422aa` |
| | #7 (`test/critical-tenant-isolation`), merged `7faba5a555c35e5a0d86894a68e7921adce23993` |
| Branch head | `fa588a3`, after merging `main` to resolve a conflict |
| Runtime scope | `apps/api/src/mcp/product-server.ts`, `product-presenter.ts`, `packages/contracts/src/mcp.ts` |

CI on #8 head `fa588a3`: authorship (both refs), `check` 1m42s and `integration` 3m6s all
passed, state CLEAN.

### Conflict resolved before merge

#7 and #8 both created `apps/api/vitest.config.ts` with different content, so merging #7
made #8 an add/add conflict. `main` was merged into #8's branch and #8's superset kept
(`include` plus `fileParallelism: false`, required by its own cross-review).
`scripts/docker-test.mjs` and `docs/README.md` auto-merged; both sides were verified
present afterwards, so the Playwright run keeps `auth-forms.spec.ts` from #7 and the
integration runner gained `mcp-discovery.integration.test.ts` from #8.

## Authorization review

The MCP OAuth boundary was traced rather than assumed:

- The principal is derived server-side from the verified token
  (`requestContext.authInfo?.extra?.principal`), parsed with a `.strict()` schema. It is
  never taken from tool arguments.
- The tool input schema carries only `cursor` and `limit`
  (`.int().min(1).max(100).default(20)`). There is no identity selector a caller could use
  to name another subject.
- It reuses the existing principal-filtered query, which sets `app.subject_type` /
  `app.subject_id` and calls `private.list_subject_workspaces(...)`. That function's caller
  is byte-identical between `main` and the deployed working tree.
- `requiredScope` is `read`, enforced by `requireScope` when the handler is built. The
  presenter emits only `data` and `page`, validated against `WorkspaceListSchema`.

## Deployed artifact

| Item | Value |
| --- | --- |
| Service | `app/backlog-api` only |
| Tag | `easypanel/app/backlog-api:release-e9260194ea2e79ce` |
| Image ID | `sha256:78bf2fe391a9eb64a348580633818e412f731f2805adcf53fd388c8eb05fe55a` |
| Source archive | `e9260194ea2e79ced0c52a9c63795d8d54a93691a7ba16c46a84e62b13ee13bc`, 237 files |
| Rollback tag | `easypanel/app/backlog-api:release-f93fe39fe47a5bdc` |

Web stayed on `release-f6b17b149f7782cd` and the PostgreSQL container kept its ID and
uptime. No migration; the release adds none. The 12 unrelated services in the `app` group
were untouched.

## Drift gate

```
added   apps/api/test/mcp-discovery.integration.test.ts
added   apps/api/vitest.config.ts
changed apps/api/src/mcp/product-presenter.ts
changed apps/api/src/mcp/product-server.ts
changed packages/contracts/src/mcp.ts
changed packages/contracts/test/contracts.test.ts
drift 6 of 237 files
```

Every entry is explained by #8 plus the reconciliation below. Nothing from the uncommitted
baseline leaked in. `docs/` and `scripts/` changes are not packaged and never reach the image.

### Baseline reconciliation

The hosted release is built from the working tree, so the merged code had to be brought in
without disturbing the uncommitted product baseline. Two files collided, both tests:

- `packages/contracts/test/contracts.test.ts`: hand-merged. `main` asserts eleven MCP tools
  while the baseline asserted ten, so shipping the new tool without this file would have
  failed local validation. The baseline's `payload_too_large` test was preserved.
- `apps/api/test/product.integration.test.ts`: **left at the baseline version.** It diverges
  genuinely (707 vs 1218 lines, +87/-598): the baseline holds task-schedule tests #7 never
  saw, and #7 added scenarios the baseline lacks. It is an integration test skipped without
  `RUN_PRODUCT_INTEGRATION` and has no runtime effect, so it was not hand-merged under
  deploy pressure. Both files were backed up to `.test-artifacts/baseline-backup/`.
  **This reconciliation is still open work.**

## Executed verification

- Validated against the baseline, not only against `main`, because production builds from
  the working tree: `pnpm build:packages` and the API `tsc` build both clean; contracts 5/5;
  API 58 passed / 17 skipped. The dependency `CursorQuerySchema` was confirmed present in
  the baseline's `common.ts` before relying on it.
- Built image inspected before promotion: `list_workspaces` present in the compiled
  `dist/src/mcp/product-server.js` and in the compiled contracts package;
  `presentWorkspaceList` present in the compiled presenter.
- Promotion changed only the image: environment digest identical before and after
  (13 keys, `85e955d9ea50`), replicas 1, `zeroDowntime` preserved.
- Running container image ID matches the release tag exactly; container healthy.
- Public `/ready` returned `{"status":"ready"}`, `/health` 200, web 200.
- MCP surface: unauthenticated `tools/list` returns 401, so the new tool is not anonymously
  listable. OAuth discovery at `/.well-known/oauth-authorization-server/api/auth` and
  `/.well-known/oauth-protected-resource/mcp` both return 200.
- Temporary builder destroyed after promotion; both the new and previous release tags still
  resolve on the daemon.

## Operational notes

- The upload returned **HTTP 524** from the Cloudflare proxy while the native build kept
  running to `done`. The documented rule held: never retry on 524, inspect the action.
  A blind retry would have started a second build.
- `services.app.destroyService` returned a clean result this time, unlike the previous
  release where it answered a non-JSON 404 despite succeeding. The quirk is intermittent,
  so confirming teardown by listing services remains the correct check.
- `pnpm check` cannot currently run in this working tree: Biome scans `.test-artifacts/`,
  which is gitignored but absent from the root `biome.json` `files.includes` exclusions.
  It reported 24 formatter errors against operational JSON dumps, and nested `biome.json`
  files from PR worktrees aborted it earlier. Compile and test gates were run directly
  instead. **Fixing that exclusion is open work and deliberately not bundled into this
  release, because `biome.json` is packaged into the production archive.**

## Limits

The MCP transport and authorization boundary were verified, but no authenticated end-to-end
`list_workspaces` call was made against production, since that would require issuing a real
OAuth token. The nine new integration cases cover that path against disposable PostgreSQL in
CI. No load testing, intrusive scanning or access to user records was part of this release.
Backup posture is unchanged and still has no daily automated database backup.
