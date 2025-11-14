# Implementation Prompt – Environment & Configuration

## Context

Manage configuration safely across environments with validation and clear separation of secrets.

## Objectives

- Provide `.env.example` with required variables and comments.
- Central config module using a schema validator (e.g., zod) that fails fast.
- Per-environment overrides (dev/stage/prod) and feature flags.
- Do not commit secrets; wire secret manager for non-local environments.

## Config Areas

- API: base URL, port, JWT issuer/audience, CORS origins.
- DB: Mongo connection string and options.
- Cache: Redis URL and namespaces.
- Signaling: WS host/ports, allowed origins.
- Frontend: public env vars (NEXT*PUBLIC*\*) or equivalent.

## Patterns

- Validate on process start; print redacted config for diagnostics.
- Strong typing exported to consumers; single source of truth package.
- Safe defaults for local dev; error on missing critical vars.

## Acceptance Criteria

- `.env.example` present and accurate; local `.env` ignored by git.
- Config loader validates and exposes typed config; app crashes early on invalid.
- Non-local envs read secrets from secret manager; no plaintext secrets in repo.

## Test Plan

- Unit tests for config schema; table-driven tests for invalid/missing vars.
- Local run with minimal `.env` works; removing required var fails.
- Staging smoke: ensure secret manager values load and validate.
