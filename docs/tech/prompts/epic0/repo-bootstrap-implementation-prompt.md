# Implementation Prompt – Repository Bootstrap

## Context

Create a cohesive repo with clear structure, consistent tooling, and commit/PR hygiene that scales with the project.

## Objectives

- Choose package manager and workspaces (e.g., npm workspaces; Turborepo optional) with root scripts.
- TypeScript base config(s) shared across packages; path aliases.
- Linting/formatting: ESLint + Prettier; EditorConfig; import/order rules.
- Git hygiene: Conventional Commits (commitlint), PR templates, CODEOWNERS.
- Hooks: pre-commit (lint-staged), pre-push checks; optional commitizen.
- Licensing and basic docs (README, CONTRIBUTING, ADR folder).

## Structure (example)

- apps/
  - web (frontend)
  - api (backend)
  - signaling (ws)
- packages/
  - shared (types/utils)
  - config (eslint/tsconfig presets)

## Scripts

- root: bootstrap, build, dev, test, lint, format, typecheck.
- each app: dev/build/test with shared tsconfig/eslint.

## Acceptance Criteria

- One command bootstraps deps; root scripts work across all workspaces.
- Lint and format are consistent; CI-ready configs exist.
- Conventional Commits enforced; PR template and CODEOWNERS present.

## Test Plan

- Run lint/format/typecheck; verify import rules and path aliases.
- Open a test PR and check templates/labels; attempt non-conventional commit and see failure.
- Build all packages/apps from root.
