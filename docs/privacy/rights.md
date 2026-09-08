# Data-subject rights matrix

| Right or request | Product capability | Operational control | Gate |
| --- | --- | --- | --- |
| Confirmation and access | Authenticated synchronous account JSON export | Human session and self-only SQL guard | V1 |
| Correction | Update account data without rewriting audit history | Authorization and before/after audit event | Gate 3 |
| Portability/access copy | Account and manager-authorized workspace JSON exports | Excludes credentials and third-party workspace data | V1 |
| Anonymization/blocking/deletion | Immediate identity deletion and membership removal | Fresh human session, exact email confirmation, sole-owner preflight | V1 |
| Sharing information | Current subprocessors list | Provider inventory owner | Gate 3 |
| Consent revocation | No consent-based optional flow in baseline | Symmetric withdrawal if introduced | Before feature |
| Opposition | Case review | Record legal basis and decision | Gate 3 |
| Automated-decision review | No material automated decision approved | Human review before such a feature | Before feature |
| Petition to the ANPD | Stated in the public privacy notice, article 18 §1 | Officer answers ANPD contact at the privacy channel | V1 |

Use the [data-subject request runbook](../runbooks/data-subject-request.md). A request must never become an IDOR path into another user or workspace.

`/v1/account/export`, `/v1/workspaces/:workspaceId/export` and `/v1/account/delete` are executable
and covered against PostgreSQL. Self-deletion preserves shared workspaces, pseudonymizes retained
domain audit references and stores only a random deletion receipt, timestamp and membership count.
Privacy channel: contato@syntaxlab.com.br, owner Thales Gomes, who is also the data
protection officer named in the public notice under article 41. Confirmation and access are
answered within the 15 days set by article 19; the other rights have no statutory term and
are answered as soon as identity and authorization are established. A data subject may
petition the ANPD under article 18 §1 without contacting us first, so an ANPD enquiry can
arrive with no prior request on record. Backup reconciliation is a
mandatory manual gate before reopening a recovered database: identify deletions after the
backup timestamp from the private rights-request record, reapply them, verify and document.
Do not reopen a restore if post-backup deletion history cannot be established.
