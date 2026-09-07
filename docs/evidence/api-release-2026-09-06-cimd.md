# API release 2026-09-06: Node 24 CIMD metadata transport

First release under the mandatory branch + PR workflow, and the first to identify the
approved Git commit alongside the image and source hashes, as the
[release baseline](../README.md#release-baseline) requires.

## Approved change

| Item | Value |
| --- | --- |
| Pull request | #5, `fix/claude-cimd-client-metadata` |
| Merge commit | `fa9e3bcfc01a9675be8de954b7977ed84ec86902` |
| Branch head | `21cbbbb` |
| Scope | `apps/api/src/auth/runtime.mjs`, plus tests and documentation |

CI on the merged head: `authorship` passed on both the branch head and the pull-request
merge ref, `check` passed, `integration` passed in 3m11s.

The authorship checker previously rejected GitHub's synthetic merge commit
`929a4a7a4e99d1e9032f514dcdc94d57bd550021`, whose author is the owner's GitHub display
name. The allowlist now accepts that name, documented in
[authorship check](../runbooks/authorship-check.md). The branch head had always passed.

## Deployed artifact

| Item | Value |
| --- | --- |
| Service | `app/backlog-api` only |
| Tag | `easypanel/app/backlog-api:release-f93fe39fe47a5bdc` |
| Image ID | `sha256:450ae5de1d31037d9fc7f479797a991a783eeddbd0d42908f7302c4d5efe49a6` |
| Source archive | `f93fe39fe47a5bdca955a3d8b846674219ae4ceddf242c7e4a1f11655edd6841`, 235 files |
| Rollback tag | `easypanel/app/backlog-api:release-f8dce7c9d21d03e2` |

Web and PostgreSQL were not touched. `backlog-web` stayed on
`release-f6b17b149f7782cd` and the PostgreSQL container kept its ID. No migration ran;
the release adds none. The 12 unrelated services in the `app` group were not modified.

## Drift gate

`backlog_deploy.py drift` compared the working tree against the previous release manifest
immediately before packaging, and again after the merge:

```
added   apps/api/test/cimd-transport.test.ts
changed apps/api/src/auth/runtime.mjs
drift 2 of 235 files
```

An independent comparison against the launch-era archive gave the same two files across
the whole API surface (`apps/api`, `packages`, root manifests). The hosted release is
built from the working tree, so this gate, not the merge, is what proves the shipped
content. The uncommitted product work described in the release baseline was already part
of the running release and was neither added nor removed by this deploy.

## Build and promotion

Built in a temporary `backlog-api-build` service with zero replicas, no domain, no mounts
and no build-time secrets, so the serving container was never built on. The native build
action was required to reach `done`; the uploader's HTTP 200 was not treated as the gate.
Promotion used `updateSourceImage` followed by `restartService`, never `deployService`.

The service environment was unchanged across promotion: 13 keys before and after, with an
identical digest. Replicas stayed 1 and `zeroDowntime` stayed enabled.

## Executed verification

- Local targeted suite before merge: 42 tests passed across `cimd-transport` and `cimd-security`.
- Built image inspected before promotion: both `src/auth/runtime.mjs` and the compiled
  `dist/src/auth/runtime.mjs` that the server loads contain the `all` branch and the pinned
  scalar path.
- Running container image ID matches the release tag exactly; container reported healthy.
- Public `https://backlog-api.syntaxlab.com.br/ready` returned `{"status":"ready"}`,
  `/health` returned 200 and the web returned 200, after promotion. The same three were
  green before promotion and were recorded as the baseline.
- Production acceptance for this specific fix: the deployed runtime fetched the official
  Claude Code client metadata document over real HTTPS and returned
  `CIMD_TRANSPORT_OK status=200` with a matching `client_id`, without bypassing TLS
  validation. This is the call that previously failed with
  `ERR_INVALID_IP_ADDRESS: Invalid IP address: undefined`.
- The temporary builder was destroyed after promotion, with no domains, mounts or running
  containers, and both the new and previous release tags still resolve on the daemon.

## Limits

The successful metadata fetch proves the transport, not a full Claude Desktop OAuth
round trip. The connector itself still needs to be retried in Claude Desktop; if it fails,
inspect its actual `client_id` and the upstream HTTP result without logging OAuth codes,
state, cookies or tokens.

No load testing, intrusive scanning or access to user records was part of this release.
Backup posture is unchanged and still has no daily automated database backup.
