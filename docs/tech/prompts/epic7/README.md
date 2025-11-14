# Epic 7 – Security & Privacy

Protect user data end-to-end and adopt security-by-default practices across the stack.

Scope (MVP):
- Encryption in transit and at rest with proper key management.
- Robust secrets handling and least-privilege access.
- Continuous security auditing and privacy safeguards.

---
## Architecture Overview
- Transport: TLS everywhere; secure WS for signaling; certificate management.
- Data: PII classification, data minimization, field-level encryption where warranted.
- Secrets: centralized store, rotation, audit.

---
## Observability
- Security logs: auth.guard.fail, token.invalid, role.denied, csp.violation.
- Metrics: auth_failures_total, suspicious_requests_total, secrets_rotations_total.
- Alerts: excessive 401/403, CSP report spikes, anomaly in login IPs.

---
## Acceptance Criteria (Aggregate)
- All external endpoints enforce TLS; strong ciphers; HSTS on web.
- Sensitive data encrypted at rest; keys managed (KMS/HSM) and rotated.
- Secrets not stored in repo/CI logs; access scoped and audited.
- Baseline SAST/DAST scans in CI; top vulnerabilities triaged.
- Privacy policy and data handling documented; logs redacted of PII.

---
## Prompts
- encryption-implementation-prompt.md
- credential-secrets-implementation-prompt.md
- security-audit-privacy-implementation-prompt.md
