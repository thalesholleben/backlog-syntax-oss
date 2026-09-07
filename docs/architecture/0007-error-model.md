# ADR 0007: error model

Status: accepted for V1

## Context

REST and MCP have different protocol envelopes, but callers need stable domain meanings and retry behavior.

## Decision

Define one domain error enum and metadata contract in `packages/contracts`. Use cases return or throw domain errors without importing a transport protocol. REST presents RFC 9457 Problem Details. MCP returns an MCP-native structured error. WebMCP maps the same error to browser tool output.

Error payloads may include a correlation ID, current resource version, and safe conflict snapshot. They never expose stack traces, tokens, cookies, connection strings, policy text, or another tenant's existence.

## Consequences

Every new error requires presenter tests across enabled surfaces. HTTP status and MCP error mapping live with presenters, while the stable error code lives in contracts.

The API rejects request bodies above 512 KiB before route parsing with HTTP `413`, RFC 9457 media type and the stable code `payload_too_large`. This ceiling is intentionally above the largest valid V1 task payload, including a 50,000-character multibyte description; `invalid_request` remains reserved for schema validation failures.
