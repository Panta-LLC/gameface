# Implementation Prompt – Caching Strategy

## Context
Reduce latency and backend load via careful caching at the API and data layers.

## Objectives
- Identify hot endpoints/queries; define cache keys and TTLs.
- Implement Redis-backed caches with stampede protection.
- Respect consistency with explicit invalidation paths.

## Layers
- HTTP: cache-control/etag where safe (GETs), CDN optional.
- Application: Redis for derived reads (profiles, room summaries).
- DB: indexes to support low-latency queries before caching.

## Patterns
- Cache-aside with jittered TTL; background refresh for popular keys.
- Locking to prevent thundering herd (setnx + short lock TTL).
- Namespaced keys per environment and tenant.

## Observability
- Metrics: `cache_hit_ratio`, `cache_latency_ms`, `cache_evictions_total`.
- Logs: `cache.get/set/miss/hit`, `cache.lock.wait`.

## Acceptance Criteria
- Documented cache map (key format, TTL, invalidation triggers).
- ≥ 80% hit ratio on selected hot paths; reduced p95 latency.
- Correctness verified under invalidation and concurrency.

## Test Plan
- Unit tests for key builders and invalidation.
- Integration tests with Redis using containers.
- Load tests showing improved SLOs with cache enabled.
