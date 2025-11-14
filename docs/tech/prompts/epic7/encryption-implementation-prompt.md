# Implementation Prompt – Encryption & Data Protection

## Context

Ensure confidentiality and integrity for data in transit and at rest with practical, automated key management.

## Objectives

- TLS 1.2+ everywhere (HTTPS/WSS); HSTS for the web app.
- Encrypt sensitive data at rest (DB snapshots, backups); evaluate field-level encryption for PII.
- Managed key lifecycle (KMS/HSM), rotation policy, and audit.

## In Transit

- Enforce HTTPS; redirect HTTP→HTTPS; set `Strict-Transport-Security`.
- WebSocket signaling over WSS; validate origins and auth tokens.
- Disable weak ciphers; prefer modern suites; enable OCSP stapling if applicable.

## At Rest

- Database-level encryption (volumes/snapshots); verify provider settings.
- Field-level encryption for highly sensitive fields (e.g., email if required), store nonces, and use AEAD.
- Backups encrypted with separate keys; test restore procedure.

## Key Management

- Use cloud KMS for envelope encryption; rotate CMKs periodically.
- Least privilege for KMS usage; audit logs for key access.
- Document break-glass access; run key rotation drills.

## Data Minimization & Retention

- Store only necessary PII; avoid storing raw media.
- Define retention windows; purge old data automatically.

## Acceptance Criteria

- TLS enforced with security headers; WSS only for signaling.
- DB/backups encryption verified; FLE applied where justified.
- KMS keys configured with rotation and audit trails.
- Runbook for restore and key rotation exists and is tested.

## Test Plan

- TLS test via automated scanners (e.g., SSL Labs grade A- or better).
- Validate CSP/HSTS/headers; attempt downgrade/weak cipher checks.
- Drill: restore from encrypted backup in staging; verify integrity.
