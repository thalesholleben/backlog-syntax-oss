# ADR 0004: human and technical principals

Status: accepted for V1

## Context

Representing an agent as a synthetic user obscures its permissions, audit trail, and revocation lifecycle.

## Decision

Memberships identify `subject_type` and `subject_id`. Human users authenticate through sessions. Service accounts live in the domain, authenticate with a prefixed token whose secret is stored only as a hash, and are bound to one workspace and explicit scopes.

V1 scopes are `read`, `write`, and `admin`. Service accounts do not receive `admin`, do not receive UI sessions, and cannot manage workspaces, members, OAuth clients, or tokens.

## Consequences

Audit events can identify actor type and origin. A credential cannot select another tenant. Revoking a service account does not disable a human identity, and deleting a human session does not silently orphan a technical principal.
