# Implementation Prompt – MongoDB Data Layer

## Context
Design durable storage for user, profile, sessions (metadata), and other resources.

## Schema & Indexing
- Collections: `users`, `profiles`, `sessions`, `audit_events`.
- Indexes: unique on `users.emailLower`, `users.username`; TTL on `sessions.expiresAt`.
- Use schema validation (JSON Schema) to enforce constraints.

## Transactions & Consistency
- Single-document atomicity preferred; use transactions for multi-collection updates when needed.
- Write idempotency via request keys.

## Performance
- Use projections; avoid N+1 with proper query design.
- Pagination via `createdAt`/`_id` with range queries.

## Security
- SCRAM auth; role-based permissions.
- Encrypt at rest (managed) and in transit (TLS).
- Store minimal PII; separate PII from operational data where possible.

## Observability
- Query logging (sampled), slow query thresholds.
- Metrics: op latency, cache hit/miss (driver), connection pool stats.

## Migration Strategy
- Migrate with versioned scripts; backward-compatible changes first.

## Acceptance Criteria
- Schemas & indexes created; queries meet latency targets.
- TTL removes expired session docs within configured window.

## Test Plan
- Unit: repository methods with in-memory Mongo.
- Integration: index uniqueness, TTL behavior, transaction rollback.

## Implementation Steps
1. Define schemas & indexes.
2. Implement repositories with typed models.
3. Add migration scripts & CI verification.
4. Instrument driver metrics and logs.
