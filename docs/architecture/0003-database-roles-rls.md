# ADR 0003: database roles and Row-Level Security

Status: accepted for V1

## Context

Application filters alone do not provide a reliable multi-tenant boundary. Tests run as an owner can also make a broken RLS policy look correct because owners may bypass it.

## Decision

Use three non-interchangeable roles:

| Role | Purpose | Runtime traffic |
| --- | --- | --- |
| `backlog_owner` | DDL and migrations | Never |
| `backlog_auth` | Identity and session schema | Human auth middleware only |
| `backlog_app` | Domain schema under RLS | Domain requests and jobs |

`backlog_app` is `NOSUPERUSER NOBYPASSRLS NOINHERIT`. Every tenant-owned table has a non-null `workspace_id`, enables and forces RLS, defines `USING` and `WITH CHECK`, and uses tenant-leading keys and indexes. Request context uses parameterized transaction-local `set_config` calls.

## Consequences

Integration and sentinel tests connect as `backlog_app`. A migration fails the gate if a tenant table lacks forced RLS or policy coverage. Owner-only success is never isolation evidence.
