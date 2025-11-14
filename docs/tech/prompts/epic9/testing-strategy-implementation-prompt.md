# Implementation Prompt – Testing Strategy (Unit, Integration, E2E)

## Context

Create a pragmatic, layered test strategy aligned with performance and security goals.

## Objectives

- Clear pyramid: many unit, fewer integration, few E2E; focus on ROI.
- Deterministic test data; ephemeral resources for integration/E2E.
- Coverage targets for core modules; mutation testing optional.

## Unit

- Pure logic: reducers, validators, game engines, utility funcs.
- Mocks/stubs minimal; prefer real implementations where cheap.
- Snapshot tests only for stable UI where visual diffs add value.

## Integration

- API + DB + Redis with containers; contract tests from OpenAPI.
- Signaling flows with test WS server; idempotency and rate limits.
- Data setup/teardown via fixtures; parallel-safe.

## E2E

- Browser automation (Playwright/Cypress) for top journeys.
- Handle media permissions via mocks/fake devices for WebRTC flows.
- Record videos on failure; capture network + console logs.

## Acceptance Criteria

- Coverage thresholds set (e.g., 80% lines/branches) for critical packages.
- Integration tests validate contracts and idempotency.
- E2E green on staging gate; failure artifacts retained.

## Test Plan

- Add minimal happy-path tests for each layer, then expand.
- Run integration locally with docker-compose; seed data.
- Stabilize E2E with retries only on known-flaky selectors.
