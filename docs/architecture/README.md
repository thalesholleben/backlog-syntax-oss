# Architecture decisions

Backlog Syntax freezes security-sensitive decisions before product breadth. Every ADR below is accepted for V1 unless a later ADR explicitly supersedes it.

| ADR | Decision |
| --- | --- |
| [0001](0001-topology-domains.md) | Separate web and API origins with environment-driven domains |
| [0002](0002-identity-tenancy.md) | Identity provider data does not own product tenancy |
| [0003](0003-database-roles-rls.md) | Three database roles and forced RLS |
| [0004](0004-principals.md) | Humans and service accounts are distinct principals |
| [0005](0005-concurrency-idempotency-leases.md) | Versions, idempotency keys, and expiring claims |
| [0006](0006-jobs-advisory-lock.md) | PostgreSQL-backed jobs with one advisory-lock leader |
| [0007](0007-error-model.md) | One domain error enum and surface-specific presenters |
| [0008](0008-webmcp-progressive-enhancement.md) | WebMCP is a non-blocking browser adapter |
| [0009](0009-mcp-oauth-fallback.md) | Prove OAuth interoperability and retain an SDK fallback |

## System boundary

```text
Browser ── HTTPS ──> Next.js web
   │
   └── exact CORS + host-only cookie ──> Hono API ──> use cases
                                             │            ├── REST presenter
MCP client ── OAuth + Streamable HTTP ───────┘            ├── MCP presenter
                                                          └── WebMCP presenter

Identity pool ── backlog_auth ── auth schema
Domain pool   ── backlog_app  ── domain schema + forced RLS
Migration job ── backlog_owner ─ DDL only
```

REST, MCP, and WebMCP may present the same use case differently, but no presenter may own authorization or domain state transitions.

## Release gates

- Gate 1: OAuth/MCP spike, frozen contracts, mock surface, and first policy proven as `backlog_app`.
- Gate 2: one complete human-agent task flow passes through REST and MCP with zero tenant escape.
- Gate 3: release evidence includes security, LGPD, Docker, restore, mobile, and independent cross-review.
