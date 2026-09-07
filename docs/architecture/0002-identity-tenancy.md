# ADR 0002: identity and tenancy

Status: accepted for V1

## Context

An authentication library can own accounts and sessions without being the product's authorization model. Mirroring an auth-plugin organization into a workspace would create two inconsistent tenancy sources.

## Decision

Better Auth owns identity, sessions, password recovery, Google login, and OAuth-provider records. The Backlog Syntax domain owns workspaces, memberships, invitations, roles, and authorization.

The API first validates a human session through the auth pool. It then starts a domain transaction, sets the trusted subject locally, resolves membership, sets the tenant context, and runs a use case. Domain rows do not reference auth tables through foreign keys.

## Consequences

Human profile details are resolved by the API only when needed. Domain authorization remains testable without granting `backlog_app` access to identity data. Changes to identity providers do not migrate workspace ownership.
