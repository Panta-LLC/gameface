# How to Use These Prompts (Contributors)

These prompts are implementation playbooks. Follow them to deliver features with consistent architecture, reliability, and quality.

## 1) Pick an Epic and read its README

- Go to the [Prompts Index](./README.md) and open the target Epic’s README.
- Confirm Scope, Architecture overview, and Aggregate Acceptance Criteria.

## 2) Choose a task-level prompt

- Open the specific implementation prompt (e.g., p2p-video-implementation-prompt.md).
- Treat it like a contract: Context → Objectives → Acceptance Criteria → Test Plan.

## 3) Implement iteratively with tests

- Start with the minimal happy path tests described in the Test Plan.
- Implement until tests pass; add edge cases next.
- Keep logs/metrics/traces wired as described for observability.

## 4) Validate quality gates locally

- Lint/typecheck; run unit/integration tests.
- For WebRTC flows, use fake devices; for API, run local containers for DB/Redis.
- Verify structured logs and metrics are emitted without PII.

## 5) Commit and link work

- Commit in small, logical chunks with clear messages.
- Reference Epic/Story IDs where applicable (e.g., GAM-2).
- Update docs/readmes/dashboards when acceptance criteria call for it.

## 6) PR and CI

- Open a PR; ensure CI passes (tests, scans, builds).
- Attach any artifacts (screens, videos, metrics snapshots) for reviewers.
- Address review feedback; keep security and privacy in mind.

## Conventions & Tips

- Keep prompts up to date: if the design changes, edit the prompt and note rationale.
- Prefer OpenAPI-first for backend; reuse shared types between services/clients.
- Use accessibility and performance budgets as acceptance criteria, not afterthoughts.
- When stuck, add a short ADR (architecture decision record) under docs/ to record trade-offs.
