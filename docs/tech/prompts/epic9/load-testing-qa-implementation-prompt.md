# Implementation Prompt – Load Testing QA

## Context
Confirm system behavior and user experience under load and at limits, complementing performance engineering.

## Objectives
- Regression load suite tied to app SLOs; focus on user-visible outcomes.
- Capacity tests to find knee points and safe throughput.
- Soak tests for stability, memory leaks, and resource drift.

## Scenarios
- Concurrent join call attempts; signaling bursts; steady gameplay.
- API mixed read/write profile reflecting real usage.
- Chaos toggles: add latency, drop packets, fail nodes.

## Quality Focus
- UX KPIs under load: join time p95, frame drops, input latency.
- Error budgets and burn-rate alerts validation.

## Acceptance Criteria
- Repeatable load QA scripts with versioned scenarios.
- Capacity numbers documented (throughput vs latency curves).
- Soak test detects no leaks; alerts calibrated to avoid noise.

## Test Plan
- Run scheduled load QA on staging weekly; compare trends.
- Attach videos/metrics from WebRTC stats and dashboards.
- Open issues automatically on SLO regressions.
