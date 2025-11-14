# Implementation Prompt – Redis Pub/Sub

## Context

Use Redis Pub/Sub for internal real-time messaging (e.g., signaling fan-out, presence updates, cache invalidation).

## Channels & Schema

- Channels: `presence:<roomId>`, `signal:<roomId>`, `cache:invalidate:<resource>`.
- Message schema: `{ type, correlationId, payload, ts }` (JSON), versioned.

## Reliability & Ordering

- Pub/Sub best-effort; for stronger guarantees consider Redis Streams (future).
- Include message sequence and replay policy (optional Streams path toggle).

## Security

- Separate Redis logical DBs or prefixes; ACLs.
- Validate payload sizes; drop oversized messages.

## Observability

- Logs: `pub.publish`, `sub.receive`, `sub.drop`.
- Metrics: `pub_messages_total{channel}`, `sub_lag_ms` (if Streams), `deliveries_total`.
- Traces: spans around publish/receive handlers.

## Acceptance Criteria

- Messages published and consumed reliably under typical load.
- No unbounded memory growth; safe backpressure strategies.

## Test Plan

- Unit: channel utils and schema validation.
- Integration: multi-subscriber fan-out; burst tests.

## Implementation Steps

1. Define channels and schemas.
2. Build publisher/subscriber modules with retry/backoff.
3. Add metrics/logging/tracing.
4. Add integration tests with docker Redis.
