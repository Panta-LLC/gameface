# Implementation Prompt – Backend APIs (REST)

## Context
Expose RESTful APIs for user/session management and supporting resources. Provide strong contracts, consistency, and observability.

## Objectives
- OpenAPI-first design; generate server stubs & client types.
- Consistent error schema; idempotency for POST where appropriate.
- Pagination, filtering, sorting patterns.

## API Design
- Versioning: `/v1` prefix.
- Error model: `{ error: { code, message, details? } }`.
- Idempotency-Key header for non-safe writes.
- Rate limiting (per-IP and per-subject) with Redis.

## Security
- JWT validation (Kinde), required scopes per endpoint.
- Input validation (zod/ajv), output serialization safety.

## Observability
- Request/response logging (redacted), trace spans, metrics (latency, RPS, errors).

## Acceptance Criteria
- OpenAPI spec published; contract tests pass.
- Endpoints return correct status codes, headers, and bodies.
- Idempotent POST prevents duplicates under retry.

## Test Plan
- Contract tests from OpenAPI.
- Integration tests using in-memory Mongo/Redis.
- Load tests for key endpoints with latency SLOs.

## Implementation Steps
1. Draft OpenAPI spec and review.
2. Implement handlers, validation, and service layer.
3. Add idempotency/store, rate limiting, and auth guards.
4. Wire tracing/metrics/logging middleware.
5. Tests and CI workflow integration.
