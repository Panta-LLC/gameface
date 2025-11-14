# Implementation Prompt – Load Testing & Tuning

## Context
Establish realistic load tests to validate SLOs and guide performance fixes.

## Objectives
- Model user journeys: login, join lobby, start call, start game, play turns.
- Generate load with ramp-up, steady-state, and spike phases.
- Capture KPIs: latency (p50/95/99), error rate, throughput, resource usage.

## Tooling
- Prefer k6 or Artillery for HTTP/WebSocket; script scenarios.
- Seed test data and auth tokens in setup.
- CI job to run smoke load; nightly heavier run.

## Scenarios
- Read-heavy API endpoints (GET rooms, GET profile).
- Write endpoints with idempotency (POST join, POST move).
- Signaling bursts (offer/answer/ICE) during join.

## SLOs & Budgets
- API p95 < 150ms for hot endpoints; error rate < 0.5%.
- Join call end-to-end p95 < 3s.
- Signaling WS p95 < 50ms server processing.

## Observability
- Push k6/Artillery metrics to TSDB (e.g., Prometheus via remote write).
- Correlate with app metrics (cache hits, DB latency, GC pauses).

## Acceptance Criteria
- Reproducible scripts checked into repo with docs.
- CI smoke load runs on PR; nightly job stores trends.
- Regression gates fail builds on significant SLO violations.

## Test Plan
- Dry-run locally against staging.
- Validate data setup/teardown; verify auth behavior.
- Chaos toggle (optional): inject latency/failures to verify alerts.
