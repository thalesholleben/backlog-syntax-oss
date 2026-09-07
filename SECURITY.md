# Security policy

## Supported versions

Backlog Syntax has not released a production version. Security fixes currently target the latest `main` branch only.

| Version | Supported |
| --- | --- |
| Unreleased `main` | Yes |
| Any copied preview | No |

## Reporting a vulnerability

Do not open a public issue, discussion, or pull request with vulnerability details.

After the repository becomes public, use GitHub's **Report a vulnerability** private advisory flow. Until that private channel exists, contact the repository owner through the verified contact listed on the `thalesholleben` GitHub profile and include only a request to establish a secure channel.

Include the affected version, impact, prerequisites, reproduction steps, and a minimal proof of concept. Remove credentials and personal data from evidence.

The maintainer will acknowledge receipt within three business days. This acknowledgement is not a remediation deadline. Triage, status updates, and coordinated disclosure timing depend on severity, reproducibility, and fix complexity.

## In scope

- authentication and session handling;
- tenant escape, IDOR/BOLA, and RLS bypass;
- OAuth/MCP audience, scope, redirect, and token failures;
- service-account privilege escalation;
- injection, SSRF, sensitive logging, and credential exposure;
- dependency or container issues with a concrete exploit path.

General hardening suggestions without an exploit path may be filed as regular issues after publication.
