# Implementation Prompt – Security Audit & Privacy

## Context
Bake security and privacy into delivery with continuous checks and clear documentation.

## Objectives
- Threat modeling (STRIDE-lite) for auth, signaling, media, and data flows.
- Security controls: security headers, CSP, rate limits, input validation.
- SAST/DAST and dependency scanning in CI; vulnerability management loop.
- Privacy by design: data mapping, consent where applicable, subject rights workflows.

## Threat Modeling
- Identify assets (tokens, PII, room membership), entry points, trust boundaries.
- Document abuse cases (credential stuffing, signaling flood, media hijack attempts).
- Define mitigations and monitoring for each threat.

## App Controls
- Headers: CSP (script-src 'self' + specific), X-Frame-Options DENY, Referrer-Policy strict.
- Input validation at API boundaries; output encoding.
- Rate limiting and IP throttling; account lockout with backoff.

## CI Security
- SAST (e.g., CodeQL) and dependency scan (Dependabot/Snyk) on PRs.
- DAST against staging (OWASP ZAP baseline) on schedule.
- Track CVEs; patch windows; exception process documented.

## Privacy
- PII inventory and data flow diagrams; data minimization.
- Log redaction and access controls; retention policies automated.
- Publish privacy notice; handle deletion/export requests.

## Acceptance Criteria
- Documented threat model and mitigations checked in under /docs.
- CI pipelines include SAST + dep scan; DAST scheduled; issues triaged.
- CSP enabled with reporting endpoint; no high/critical findings outstanding.
- Privacy policy and data handling guide present; log PII redaction verified.

## Test Plan
- Run baseline ZAP scan on staging and capture reports.
- Validate CSP with a report-only phase, then enforce.
- Tabletop: simulate incident triage and breach notification workflow.
