# Data-subject request

## Objective

Handle LGPD requests without disclosing or deleting another person's or tenant's data.

## Prerequisites

- privacy channel contato@syntaxlab.com.br; request owner Thales Gomes / Syntax Lab;
- identity-verification procedure proportional to the request;
- export and deletion tooling tested against disposable tenants.

## Steps

1. Record the request type, received date, claimed identity, and affected workspace.
2. Acknowledge it without exposing whether another account exists.
3. Verify identity and authority for the relevant workspace.
4. Locate data by trusted identifiers across account, domain, audit, export, and provider systems.
5. Apply access, correction, portability, opposition, revocation, anonymization, or deletion as legally applicable.
6. Record data that must be retained, its legal reason, and the end criterion.
7. Respond through the verified channel and preserve a minimal decision trail.

## Validation

- the export contains only the verified subject's accessible data;
- another tenant's identifiers return no data or effect;
- deletion follows the retention matrix and backup reconciliation plan;
- the response does not contain credentials, internal secrets, or unnecessary third-party data.

## Escalation

The internal target is seven days for routine handling. Complex legal questions are escalated rather than answered by an unverified automation.
