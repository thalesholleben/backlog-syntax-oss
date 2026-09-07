# ADR 0008: WebMCP as progressive enhancement

Status: accepted for V1

## Context

The browser WebMCP API is experimental and can change independently of the product's remote agent integration.

## Decision

Remote MCP remains the primary agent surface. WebMCP registers a smaller contextual tool set through `document.modelContext` only when supported, only for the active project, and with abort handling. Unsupported browsers receive a silent no-op.

The adapter calls the authenticated REST API and contains no authorization or domain rules. Task text, template text, evidence, and links are always labeled untrusted. V1 tools never fetch a task-provided URL.

The contextual surface exposes `list_tasks`, `create_task`, `update_task_status`, and
`schedule_task`. Scheduling changes `scheduledDate` only; deadlines remain in `dueDate`. All four
tools are scoped to the active workspace/project chosen by the authenticated page.

## Consequences

WebMCP failure cannot block the release or break the human UI. Browser registration, schema, abort, and unsupported-mode behavior require unit tests before the adapter ships.
