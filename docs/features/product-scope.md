# Product scope

## Purpose

Backlog Syntax coordinates work between people and AI agents without treating task text as authority. It combines an ordinary backlog projection with explicit machine-safe contracts.

## V1 scope

- email/password and feature-flagged Google login with mandatory legal acceptance;
- workspaces and four human roles; membership administration remains API-limited;
- scoped service accounts and personal access tokens;
- projects, tasks, fixed statuses, priority, weekly scheduling, independent due dates and archive;
- claims with lease and extension, release, handoff, evidence and activity;
- REST `/v1`, generated OpenAPI, remote MCP, and optional contextual WebMCP;
- synchronous JSON export, guarded account deletion and documented retention gaps;
- responsive public and authenticated experiences, with app-style mobile navigation, scrollable boards and a weekly agenda;
- public boxed integration documentation and an authenticated guide using the same content.

Backlog and Tasks share the same records. The backlog groups by status, while Tasks groups
by `scheduledDate` across Monday to Friday plus a shared weekend column. `dueDate` is
independent of scheduling. Login/signup pages reuse a valid session; missing legal acceptance
and onboarding still keep their own gates.

In the hosted V1, Google login and transactional password-recovery email are disabled.
WebMCP is experimental and optional; unsupported browsers retain all human-facing features.

## Invariants

- Human and technical principals are distinct.
- Agents never receive destructive delete or workspace-administration tools.
- Archive is reversible and every state transition is authorized on the server.
- Claims, stale writes, and duplicate requests have deterministic outcomes.
- Tenant boundaries are enforced by the application and forced PostgreSQL RLS.

## Primary scenario

1. A person creates a workspace, project, and task with acceptance criteria.
2. A scoped agent reads workspace context and claims the task.
3. The agent records evidence and completes or hands off the task.
4. The UI refreshes the same state and activity trail.
5. A principal from another tenant observes no data and causes no effect.

The same scenario must pass through REST and MCP drivers against the same state.

## Non-goals for V1

Billing, file uploads, labels, dependencies, transactional email, custom workflows, Redis, multiple
worker services, Kubernetes, 2FA, CSV/Markdown export and production analytics are not part of V1.
