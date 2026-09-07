# Subprocessors and international transfers

Launch inventory, 2026-09-05. Operational owner: Thales Gomes / Syntax Lab.

| Function | Provider | Region/country | Data | Role/DPA | Transfer mechanism | Status |
| --- | --- | --- | --- | --- | --- | --- |
| App hosting/database | Hostinger, dedicated VPS | São Paulo, Brazil | Account/workspace data and operational metadata | Hostinger public DPA reviewed | DPA addresses subprocessors/transfers; primary storage is Brazil | Dedicated Backlog services, private DB |
| Edge protection/DNS | Cloudflare | Global network, including processing outside Brazil | Requests, IP and transport metadata; TLS termination | Public customer DPA and Brazil LGPD page reviewed | Provider DPA/Brazil contractual clauses | Full (strict), no authenticated caching |
| Offsite backup | Google Drive | Global processing; region not selected by this integration | Launch/maintenance database backup, not daily | Standard Google DPA reviewed, account-specific contractual coverage not independently verified | Must be confirmed by account owner for this specific account; do not claim verified Workspace coverage | Separate private backup location; 14-copy retention on new successful uploads |
| Transactional email / Google login | Not enabled | Not applicable | No data sent | Evaluate before activation | Evaluate before activation | Disabled |
| Observability | EasyPanel/Docker local logs | Same VPS | Redacted operational metadata | Hosting terms | Same hosting controls | No external analytics/tracing provider |

Sources checked: https://www.hostinger.com/legal/dpa ;
https://www.cloudflare.com/cloudflare-customer-dpa/ ;
https://www.cloudflare.com/trust-hub/brazil-lgpd/ ;
https://cloud.google.com/terms/data-processing-addendum . Public standard terms do not
prove account-specific acceptance. No claim of audited legal compliance is made.
Provider incident/support escalation uses the account owner's authenticated provider
support channels; never put their account credentials in this inventory.
Backups expire through the panel's retention mechanism; account deletion is reconciled
before a restored database may serve traffic. See retention.md and the deployment runbook.
