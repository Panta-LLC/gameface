# GameFace Authentication & Session Management

Central reference for user authentication flows: Registration (GAM-2), Login (GAM-3), Session Persistence, Logout. Built on a service-oriented architecture integrating Kinde for identity, with internal services for profile, sessions, audit, and future risk analysis.

---

## High-Level Architecture

```
+-------------------+        +-------------------+
| Frontend (Web/App)| <----> | Identity Service  | -- Kinde SDK --> Kinde Auth Platform
+---------+---------+        +---------+---------+
          |                           |
          |                           v
          |                 +-------------------+
          |                 | Session Store     | (Redis)
          |                 +-------------------+
          |                           |
          |                           v
          |                 +-------------------+
          |                 | Audit Log Service |
          |                 +-------------------+
          v
+-------------------+        +-------------------+
| Profile Service   |        | Future: Risk/MFA  |
+-------------------+        +-------------------+
```

Design Principles:

- Stateless JWT auth; minimal internal persistence of session metadata (no raw tokens).
- Strong separation: identity concerns vs profile vs audit vs risk.
- Observability-first: structured logs, metrics, traces on all auth-critical paths.
- Secure by design: least-privilege tokens, rotation, revocation, lockout, rate limiting.

---

## Core Flows

### Registration (GAM-2)

Supports username/password and social providers (Google, Discord initial). Enforces password policy, email uniqueness, and emits audit trail for attempts and outcomes.

### Login (GAM-3)

Validates credentials (Kinde), supports lockout after threshold failures, rate limiting, social OAuth callback handling, token refresh, and logout. Updates `lastLoginAt` in profile.

### Session Persistence

Maintains scalable session records (multi-device). Implements refresh token rotation, revocation sets, concurrency limits, inactivity + absolute lifetimes, device tracking, and global invalidation (logout-all).

### Logout

Single or global (all sessions) with idempotent behavior. Revokes refresh tokens (and optionally access tokens), updates audit log, emits metrics.

---

## Endpoint Catalog (Identity Service)

| Group        | Method | Path                               | Purpose                         | Auth    | Rate Limit          |
| ------------ | ------ | ---------------------------------- | ------------------------------- | ------- | ------------------- |
| Registration | POST   | /v1/auth/register                  | Create user (username/password) | Public  | Yes (5/min/IP)      |
| Availability | GET    | /v1/auth/availability?username=    | Check username                  | Public  | Moderate            |
| Availability | GET    | /v1/auth/availability?email=       | Check email                     | Public  | Moderate            |
| Social       | GET    | /v1/auth/social/:provider/start    | Begin social auth               | Public  | Moderate            |
| Social       | GET    | /v1/auth/social/:provider/callback | OAuth callback                  | Public  | Provider throttling |
| Login        | POST   | /v1/auth/login                     | Password login                  | Public  | Yes (10/min/IP)     |
| Status       | GET    | /v1/auth/status                    | Current user snapshot           | Bearer  | Low                 |
| Refresh      | POST   | /v1/auth/token/refresh             | Rotate tokens                   | Refresh | Strict              |
| Logout       | POST   | /v1/auth/logout                    | End current session             | Bearer  | Moderate            |
| Logout       | POST   | /v1/auth/logout/all                | End all sessions                | Bearer  | Moderate            |
| Sessions     | GET    | /v1/sessions                       | List active sessions            | Bearer  | Moderate            |
| Sessions     | POST   | /v1/sessions/refresh               | Refresh (alt path)              | Refresh | Strict              |
| Sessions     | DELETE | /v1/sessions/:sessionId            | Revoke one session              | Bearer  | Moderate            |
| Sessions     | DELETE | /v1/sessions                       | Revoke all (version bump)       | Bearer  | Moderate            |
| Sessions     | PATCH  | /v1/sessions/:sessionId/ping       | Heartbeat / lastSeenAt          | Bearer  | Low                 |

---

## Data Models (Internal)

### UserCore (subset)

`id, kindeUserId, email(lower), username(optional), authProvider, emailVerified, status, createdAt, updatedAt`

### UserProfile

`userId, displayName, avatarUrl, preferences(json), lastLoginAt`

### SessionRecord

`sessionId, userId, deviceId, userAgent, ip, createdAt, lastSeenAt, lastRefreshedAt, expiresAt, absoluteExpiresAt, status, version`

### AuditEvent

`id, userId?, type, correlationId, timestamp, actorIp, details(redacted)`

---

## Security Controls

| Control                       | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| Password policy               | Prevent weak credentials                      |
| Email canonicalization        | Avoid duplicates, case-insensitive uniqueness |
| Lockout (login)               | Mitigate brute force (e.g., 5 fails / 15m)    |
| Rate limiting                 | Protect endpoints & token refresh             |
| Refresh rotation              | Minimize replay risk                          |
| Token hashing (SHA256+pepper) | Avoid storing raw tokens                      |
| Revocation sets               | Support logout & global invalidation          |
| Concurrency limit             | Cap active sessions per user                  |
| Audit logging                 | Forensically track auth events                |
| Constant-time checks          | Reduce side-channel leakage                   |
| HTTPS-only + secure headers   | Transport security                            |

Additional: Optionally anonymize IP (CIDR truncation) for privacy while enabling coarse security analytics.

---

## Observability

### Logging (Structured JSON)

Fields: `timestamp, level, service, event, correlationId, userId?, sessionId?, deviceId?, provider?, outcome, latencyMs`. No raw passwords, tokens, emails (use hashed identifier).
Events (sample):

- registration.attempt / registration.success / registration.failure
- login.attempt / login.success / login.failure / login.locked
- session.create / session.refresh / session.revoke / session.revoke_all / session.expire
- logout.request / logout.success / logout.all

### Metrics

- registration_attempts_total / success / failure
- login_attempts_total / success / failures / lockouts
- sessions_active_total (gauge)
- session_refresh_attempts_total / success / failure
- session_revoke_total
- logout_requests_total / logout_all_requests_total
- auth_latency_ms (histogram with labels `operation=login|refresh|register|logout`)

### Tracing (OpenTelemetry)

Span roots: `auth.register`, `auth.login`, `auth.refresh`, `auth.logout`, `session.refresh`, `session.revoke`. Child spans for validation, provider calls, persistence, audit emission.

---

## Error Model

Consistent JSON:

```
{ "error": { "code": "BAD_CREDENTIALS", "message": "...", "retryAfterSec?": 900 } }
```

Selected codes: `INVALID_INPUT`, `EMAIL_IN_USE`, `BAD_CREDENTIALS`, `ACCOUNT_LOCKED`, `RATE_LIMIT`, `INVALID_REFRESH_TOKEN`, `SESSION_EXPIRED_ABSOLUTE`, `AUTH_PROVIDER_UNAVAILABLE`, `UNAUTHORIZED`.

---

## Session Lifecycle

1. Login/Registration success -> create session record.
2. Client uses access token for protected requests; refresh token for rotation.
3. Refresh -> rotate refresh token, update session metadata, revoke old token hash.
4. Logout single -> mark session REVOKED.
5. Logout all -> increment `userSessionVersion` or iterate & revoke; all future tokens invalid.
6. Expiration -> background janitor marks EXPIRED, cleans metrics.

---

## Edge Cases & Handling

| Scenario                            | Handling                                                     |
| ----------------------------------- | ------------------------------------------------------------ |
| Social provider returns no email    | Request user to supply; provisional profile until completion |
| Concurrent refresh                  | First wins; others see revoked old token -> 401              |
| Duplicate social callback           | Idempotent: existing user reused                             |
| Login during lockout                | 423 with `ACCOUNT_LOCKED` code                               |
| Global logout during active refresh | Refresh returns 401 post-revocation                          |
| Expired verification token          | Reissue flow (future)                                        |

---

## Acceptance Criteria (Aggregate)

- All listed endpoints operational, validated via tests.
- Password + social registration & login succeed; errors follow taxonomy.
- Session listing, refresh, revoke, and logout-all behave per spec.
- Observability artifacts (logs, metrics, traces) present & privacy compliant.
- Security controls (lockout, rate limiting, rotation) enforced & tested.
- No sensitive data appears in logs/audit.

---

## Testing Strategy

Layers:

- Unit: validation, lockout logic, refresh rotation, session revocation, hashing.
- Integration: end-to-end flows (register -> login -> refresh -> logout -> re-login), social callback path.
- Security: ensure no enumeration (uniform 401), timing bounds, token theft scenarios simulated.
- Performance: load test login & refresh concurrency; maintain latency SLO (p95 <200ms login, <250ms refresh).
- Observability verification: assert trace spans & metrics counters increment via test harness.

---

## Deployment & Ops Notes

- Redis high-availability (primary + replica); persistence snapshot to survive restarts.
- Configuration through environment vars: token lifetimes, lockout thresholds, rate limits, pepper secret source.
- Feature flags for future MFA & risk scoring integration.
- Rollbacks safe: stateless services; session records backward compatible (additive fields only).

---

## Roadmap / Future Enhancements

| Feature                         | Description                                              |
| ------------------------------- | -------------------------------------------------------- |
| MFA / TOTP / WebAuthn           | Strengthen auth for high-risk actions                    |
| Adaptive Risk Engine            | Geo/device anomaly scoring, step-up auth                 |
| Device Trust Levels             | Persist trust + require re-verification                  |
| Session Anomaly Alerts          | Real-time detection of unusual patterns                  |
| Admin Session Management        | Force revoke by admin console                            |
| Refresh Token Binding           | Tie refresh to device fingerprint to reduce theft impact |
| IP Anonymization & Privacy Mode | GDPR compliance improvements                             |

---

## Implementation References

See individual prompt files:

- `user-registration-implementation-prompt.md`
- `user-login-implementation-prompt.md`
- `user-session-persistence-implementation-prompt.md`
- `user-logout-implementation-prompt.md`

All implementations must maintain consistency with this README. Treat this document as the canonical spec; deviations require review.

---

## Quick Start Checklist (Dev)

1. Configure Kinde credentials & environment secrets.
2. Implement identity-service endpoints incrementally (register -> login -> refresh -> logout -> sessions).
3. Add structured logging & metrics instrumentation early.
4. Write unit tests for core auth utilities before integration endpoints.
5. Validate lockout & rate-limit behavior with test harness.
6. Verify traces emitted via local OpenTelemetry collector.
7. Conduct security log scrub review before deployment.

---

## Definition of Done (Auth Epic Aggregate)

- Functional endpoints complete & documented.
- Test suites passing with coverage ≥80% on auth modules.
- Security & privacy checks passed.
- Operational readiness: metrics dashboards + basic alerts (lockout surge, high failure rate).
- README updated and committed.
