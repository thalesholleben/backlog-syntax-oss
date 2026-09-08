# LGPD baseline

Launch baseline, 2026-09-05. Owner: Thales Gomes / Syntax Lab, CNPJ 61.779.209/0001-90.
Support, incident and privacy contact: contato@syntaxlab.com.br. These records describe
implemented controls and remaining limits; they are not a certification of legal compliance.

- [Data inventory](data-inventory.md)
- [Retention matrix](retention.md)
- [Data-subject rights](rights.md)
- [Subprocessors and international transfers](subprocessors.md)
- [Incident response runbook](../runbooks/incident-response.md)

Hosting/database: Hostinger São Paulo; edge protection: Cloudflare global network;
offsite launch/maintenance backup: existing Google Drive destination. Hostinger already runs
weekly VPS backups; the EasyPanel free plan does not execute database backup schedules.
Email/OAuth providers are not enabled.
Before adding sensitive-data processing, profiling or another provider, reassess the legal
basis, international transfers and incident/deletion obligations.

## Notice revisions

The privacy notice carries its own revision date, and `legalNoticeVersion` in
`apps/web/lib/site.ts` is the single identifier of the legal bundle a user accepts. Bump it
whenever the terms or the notice change materially, so one recorded version always maps to
one text. Sign-in checks that the field is present, not that it equals the current value, so
a clarifying revision does not force existing users to accept again. A revision that widens
processing, adds a purpose or adds a recipient is not clarifying and needs that decision made
deliberately.

Revision of 2026-09-08: named the data protection officer under article 41, enumerated the
article 18 rights including petition to the ANPD, and stated the transfer mechanism per
destination. No new processing, purpose or recipient.

## Before analytics or tracking ships

No tracking exists today and both the privacy notice and the cookies page say so in public.
Any release that introduces analytics, advertising or product telemetry must carry all of the
following in the same release, never as a follow-up:

- purpose and legal basis recorded in the data inventory, with consent as the basis for every
  optional purpose;
- consent collected before the first non-essential tag loads, denied by default, with
  withdrawal as easy as granting, and the decision recorded;
- the provider added to `subprocessors.md` with country, data, role and transfer mechanism;
- the privacy notice and the cookies page updated in both locales in the same pull request,
  and `legalNoticeVersion` bumped;
- retention configured at the provider rather than left at its default.

The cookies page currently promises that optional analytics stays off until a prior choice,
a recorded decision and an equivalent way to withdraw all exist. Shipping a tag first and the
notice afterwards would make that statement false, which is worse than having no page at all.
