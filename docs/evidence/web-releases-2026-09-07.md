# Web releases, 7 September 2026

Two web promotions on the same day, and the first releases produced from this
repository instead of a local working tree.

## Why the source changed

Earlier releases were built from a sanitized archive of a private working tree that
held uncommitted product work, so a checkout never reproduced production. This
repository is a complete, audited snapshot: a file-by-file comparison against the tree
that produced the running release found the same 237 files, 231 byte-identical, and
every one of the six differences explained. Releases now carry real Git provenance.

## Release 1: English and public SEO/GEO

| Item | Value |
| --- | --- |
| Pull request | #1, merged `0d2ac449` |
| Tag | `easypanel/app/backlog-web:release-597f60860a8d44ba` |
| Image ID | `sha256:f1b634e4da0411e112fe6be738c26da58ad7bc4688c4d2cd29b8b9198d1ea49b` |
| Source archive | `597f60860a8d44baba8a1b9e35b6c94f7c684b23630469037dccaa7ec4003bac`, 255 files |
| Rollback | `easypanel/app/backlog-web:release-853d0a60eeaa61c9` |

`/en`, `/en/docs` and `/en/privacy` returned 404 before and 200 after. Canonical and
reciprocal `hrefLang` (`pt-BR`, `en`, `x-default`) resolve to the production domain,
and the sitemap lists twelve URLs. No `localhost:3000` string survived into the server
bundle, which is the failure mode that a wrong build-time `PUBLIC_WEB_URL` would cause
without any health check noticing.

## Release 2: single header access button

| Item | Value |
| --- | --- |
| Pull request | #2, merged `162a8a90` |
| Tag | `easypanel/app/backlog-web:release-5f29c1ed96df9a9e` |
| Image ID | `sha256:c7d97f33d73ac330f61209d037dfed475c3f7acd69674734a4224752ca44ad70` |
| Source archive | `5f29c1ed96df9a9e83934eec47ab0c0380612f938a8fc3cdf5d1bc01824a4a72`, 255 files |
| Rollback | `easypanel/app/backlog-web:release-597f60860a8d44ba` |

Header order in production, both locales:

```
Como funciona > Arquitetura > Documentação > GitHub > Entrar / Criar conta > PT|EN
How it works  > Architecture > Documentation > GitHub > Sign in / Create account > PT|EN
```

The merged button appears once, no standalone exact `Criar conta` link remains in the
header, and the hero keeps its own `Criar conta grátis` call to action.

For both releases the drift gate listed only the intended files, the running container
image ID matched the release tag exactly, the environment digest was identical before
and after promotion, replicas and `zeroDowntime` were unchanged, the temporary builder
was destroyed, and the twelve unrelated services in the `app` group were untouched.
The API and PostgreSQL were not promoted or restarted.

## Defects found while releasing

### The image optimizer hangs when it cannot write its cache

The Docker suite began running every spec rather than only `real-stack.spec.ts`, which
switched on two no-JavaScript tests that had never executed in CI. Both failed. The
pages were not broken: the container runs with a read-only root filesystem, Next writes
optimized images under `.next/cache`, the directory could not be created, and the
optimizer rejected unhandled so the request never received a response.

Reproduced with plain curl, no browser involved:

| `Accept` | Result |
| --- | --- |
| `*/*` | 200 in 21 ms, original PNG |
| `image/avif` | 200 in 14 ms, original PNG |
| `image/webp` | no response, 180 s, zero bytes |

Only clients that accept WebP were affected, which is every real browser. A request
with `Accept: */*` served the original file and looked healthy, which is why it went
unnoticed. Production was not affected, because its filesystem is writable and it
returned a real WebP in 189 ms.

Two fixes followed. `compose.yaml` mounts a writable tmpfs at the cache path, keeping
the read-only hardening. The web image now creates the directory, which the standalone
output does not ship, and refuses to boot when it is not writable, so a hardened runtime
fails loudly at startup instead of hanging on every image request behind a green health
check.

### The packager silently dropped a directory the build needs

The first attempt at release 1 failed with `ENOENT` on `patches/next@16.3.3.patch`.
The archive allowlist covered `apps`, `packages`, `openapi` and seven root files, and
`patches` was absent, so a file referenced by `patchedDependencies` never reached the
build context. The allowlist now includes it.

This is a blind spot of the drift gate by construction: the gate compares what was
packaged against the previous release, so it cannot report a directory the allowlist
never considered. A pull request that adds anything to the repository root needs the
allowlist checked by hand.

### An upload returning 500 is not the 524 case

An earlier API release received HTTP 524 from the proxy while the native build ran
through to `done`; retrying would have started a second build. Release 1 received a
500 and the action was genuinely in `error`. Reading `actions.getAction` is what
separates the two, in both directions.

## Limits

Ranking, indexation and AI citations are not measured here. The releases were verified
through public HTTP responses and container inspection, not through a full authenticated
walkthrough. Backup posture is unchanged and still has no daily automated database backup.
