# Web release, 8 September 2026

Privacy notice revision, and the first release promoted by the operator's own `promote`
action rather than by hand.

## Release

| Item | Value |
| --- | --- |
| Pull request | #5, merged `b310ded` |
| Tag | `easypanel/app/backlog-web:release-8b84c0de280fd354` |
| Image ID | `sha256:167a00ee262698b70af74f246e638822fb56636b20c301f513bbe41b79077ed6` |
| Source archive | `8b84c0de280fd354e386f934591e193b0a79c3c198e75e915530078beac71ff6`, 255 files |
| Rollback | `easypanel/app/backlog-web:release-cde80cce31154d85` |

The drift gate listed six files, all of them from the pull request. The two documentation
files it changed are absent by design: the archive allowlist does not package `docs`.

## What shipped

The published notice already named a legal basis per purpose and disclosed processing
outside Brazil, so this closed what was actually missing rather than rewriting the page.
The right to petition the ANPD under article 18 §1 is now stated, alongside the nine
article 18 rights and the 15-day term of article 19 for confirmation and access. An officer
is named under article 41, at the channel that was already published. A section states the
transfer mechanism per destination and stops where the evidence stops: Hostinger and
Cloudflare rely on the contractual clauses of their reviewed public DPAs, while for Google
Drive the standard addendum was reviewed and account-specific coverage was not
independently verified, so none is claimed.

`legalNoticeVersion` moved to `2026-09-08` and now has one home in `apps/web/lib/site.ts`,
replacing a constant and an inline literal that had already drifted apart in two
components. Existing users are not asked to accept again: sign-in checks the field is
present rather than equal, and the revision adds no processing, purpose or recipient.
`LegalPage` takes an optional per-page version, so terms, cookies and transparency keep
their launch date instead of inheriting a revision they did not have.

No tracking was added and the notice still says there is none. `docs/privacy/README.md`
records what an analytics release must carry in the same deploy for that statement to stay
true.

## Verification

Both locales were checked in the built image before promotion and over public HTTP after
it. `/`, `/privacidade`, `/en/privacy`, `/termos`, `/en/terms`, `/cookies` and `/entrar`
returned 200; the API returned `{"status":"ready"}` and was neither promoted nor restarted,
and PostgreSQL was untouched. The English page contains no Portuguese, `/termos` still
shows the launch date, and the running container image matched the release tag exactly with
the environment digest unchanged across promotion. The temporary builder was destroyed, its
container is gone, both the new tag and the rollback tag survive, and the twelve services in
the `app` group are unchanged.

The image optimizer answered `image/webp` in 300 ms for a browser `Accept` header, which is
the path that hung under a read-only filesystem in the previous release and the reason a
health check alone does not close a web deploy.

## Defect closed: a promotion that changed nothing reported success

During the 7 September release the console lost the response of a `docker tag` that had
already succeeded on the server. The script died before writing `release-web.json`, the next
step read that stale record, re-applied the previous release's tag, which was already
running, and printed success. Only comparing the before and after image revealed that
production had not moved. A deploy that lies is worse than one that fails.

The fix is structural rather than a check bolted on top: `release-<service>.json` became an
output and is read by nobody, so a stale copy can no longer decide what gets promoted. The
tag is derived from the release manifest and the image from the builder. `promote` also
refuses when the target tag is already both configured and running, waits for the containers
to come up on the new tag, and asserts that environment and deploy settings did not move.
The guard was tested by reproducing the exact failing state against the live server, which
aborted as intended without touching production.

A second guard was corrected in the same pass. Tag immutability means a release tag never
points at two different images, not that the tag may not already exist. The previous check
refused any existing tag, which turned a lost response into a blocked recovery. Re-tagging
the same image is now allowed and only a tag pointing at a different image is refused.

## Limits

The notice was reviewed against the LGPD and the ANPD's published guidance; it is not a
legal opinion and no certification of compliance is claimed. Contractual coverage of the
offsite backup destination remains unverified, which is why the page says so. Backup posture
is unchanged and still has no automatic daily database backup.
