# Implementation Prompt – CI Test Automation & Reporting

## Context

Automate testing in CI with fast feedback, flake management, and actionable reports.

## Objectives

- Parallelize tests; cache dependencies; shard E2E runs.
- Flake detection/quarantine; retry policy for known flaky tests only.
- Rich reporting: junit, coverage, videos, and dashboards.

## Pipeline

- Unit/integration on PR; E2E on PR for touched areas or nightly full.
- Test impact analysis to skip unaffected suites.
- Store artifacts for failures; link to runbooks.

## Data & Environments

- Ephemeral test env with seeded data; cleanup on completion.
- Fake devices for media; TURN server in test mode if needed.

## Acceptance Criteria

- CI surfaces clear pass/fail with links to artifacts.
- Flaky tests tracked and quarantined automatically.
- Coverage uploaded and enforced; trend visible across commits.

## Test Plan

- Seed a few known-flaky tests to validate quarantine flow (then fix!).
- Measure pipeline duration; optimize with sharding/caching.
- Verify artifact retention and permissions.
