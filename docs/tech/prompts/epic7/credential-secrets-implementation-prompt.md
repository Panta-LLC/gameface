# Implementation Prompt – Credential & Secrets Handling

## Context
Prevent credential leakage and centralize secrets with rotation and auditing.

## Objectives
- Centralized secret store (e.g., AWS Secrets Manager) or environment-backed with strict controls.
- Rotation policies for API keys, DB creds, and JWT signing keys.
- Principle of Least Privilege for services and CI.

## Storage & Access
- Never commit secrets; enforce pre-commit scans (gitleaks/trufflehog).
- Use parameter store/secret manager for runtime; inject via env at deploy.
- Limit read access per service; short-lived credentials when possible.

## CI/CD Practices
- Separate CI roles from prod; read-only where appropriate.
- Mask secrets in logs; block printing envs; scrub artifacts.
- Rotate CI tokens regularly; store provenance (SLSA/attestations optional).

## JWT/Keys
- Prefer asymmetric signing for JWTs; rotate keys; publish JWKS.
- Keep refresh token TTL short; revoke on logout/device removal.

## Developer Hygiene
- `.env*` in .gitignore; use sample `.env.example` with placeholders.
- Local secret injection via secure tooling; no plaintext sharing.

## Acceptance Criteria
- No plaintext secrets in repo/CI logs; scanners clean.
- Secrets retrieved at runtime from a managed store; access narrowly scoped.
- Documented rotation playbooks executed successfully in staging.

## Test Plan
- Run secret scanning on the repo and CI history.
- Simulate secret rotation; validate zero-downtime credential rollover.
- Chaos: intentionally revoke a secret in staging; verify graceful failure.
