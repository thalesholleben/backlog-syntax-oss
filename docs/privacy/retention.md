# Launch retention matrix

Owner: Thales Gomes. Automated and manual controls are distinguished below.

| Category | Trigger | Proposed active retention | End action |
| --- | --- | --- | --- |
| Active account and workspace | Account/workspace creation | While contract or legitimate purpose remains | Export, then authorized deletion or anonymization |
| Account self-deletion | Fresh authenticated confirmation | Immediate for identity, sessions, OAuth tokens and memberships | Keep only a random minimal receipt; shared tenant data remains |
| Sessions and recovery tokens | Creation | Until expiry or revocation | Delete |
| Invitations | Creation | Until expiry/revocation | Delete or retain minimal audit event |
| Idempotency records | Accepted operation | 24 hours | Batched physical deletion under the housekeeping advisory lock |
| Workspace audit trail | Event | While the shared workspace remains active; pseudonymized account references on self-delete | Delete with workspace or minimize |
| Operational logs | Event | Bounded Docker log rotation; not a guaranteed day count | Rotate, no request bodies/tokens |
| Rights-request record | Request closure | Review after 180 days; preserve longer only for a documented legal obligation/dispute | Manual monthly minimization review by owner |
| Database backups | Launch/maintenance backup | Latest14 copies per destination, VPS and Google Drive; no daily schedule in the free panel license | Retention on successful new uploads; owner reviews expired-purpose copies during maintenance |
| VPS backups | Existing Hostinger weekly automation | Provider's rolling plan retention; two snapshots present in launch inspection | Provider rotation; reconcile valid deletions before reopening a restore |

The implemented housekeeping loop expires task leases and physically deletes expired idempotency
payloads under an advisory lock. Session/invitation authorization expiry is enforced, but physical
cleanup of all expired records and support-record review are not fully automated. EasyPanel's
native schedule is not entitled on this free license and has been disabled, not represented as
active. Manual backup retention is applied on a new upload; the Hostinger VPS backup is weekly.
Manual copies can therefore outlive14days; review them during maintenance and delete copies no
longer needed for recovery/legal purposes. Backup restoration must reconcile valid
deletions before the restored environment can serve traffic.
