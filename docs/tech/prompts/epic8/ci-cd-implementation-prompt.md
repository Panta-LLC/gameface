# Implementation Prompt – CI/CD Pipelines

## Context
Establish reliable CI/CD to ensure quality gates and repeatable deployments.

## Objectives
- Workflows: lint/typecheck, unit/integration tests, build, security scans, release.
- Environments: dev, staging, production with approvals and protections.
- Artifacts: build caches, SBOMs, signed images, provenance.

## Pipeline Stages
- PR: lint, tests, SAST, dependency scan, light load test (optional).
- Main: build artifacts/images; push to registry; sign (cosign/slsa-provenance).
- Release: tag-driven deploy to staging; manual approval to prod.

## Security
- Least-privilege CI tokens; OIDC to cloud; no long-lived creds.
- Secrets from manager; never echo secrets; mask outputs.

## Acceptance Criteria
- All PRs run CI gates and block on failures.
- Release pipeline deploys to staging automatically on tags.
- Manual approval gate to production; rollback workflow documented.

## Test Plan
- Intentionally break lint/tests to see failure gates.
- Dry-run deployment to staging; confirm artifact integrity.
- Simulate rollback to previous tag.
