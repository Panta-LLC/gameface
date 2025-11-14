# Implementation Prompt: GAM-2 – Implement User Registration (Service-Oriented Architecture)

## Context

GameFace is a gamer-focused real-time video and collaboration platform. Task `GAM-2` covers implementing the foundational User Registration capability. This will be delivered as part of a service-oriented architecture (SOA) and must support both traditional username/password and social login via Kinde.

## Architectural Goals

- Service-Oriented: Decompose into independently deployable services (e.g., `identity-service`, `profile-service`, `audit-log-service`).
- Stateless APIs: All session/auth state handled via Kinde-issued tokens (ID, access, refresh) – no server-side session persistence beyond short-lived cache for performance.
- Observability & Logging: Structured, leveled logs (TRACE/DEBUG/INFO/WARN/ERROR) with correlation IDs. Emit metrics (registration attempts, successes, failures, latency) and traces (OpenTelemetry). All authentication boundary events audited.
- Security: Zero trust perimeter, validate tokens on every request. Use least-privilege scoped tokens. Parameterize secrets (no hard-coded keys). Apply rate limiting on registration & login endpoints.

## Functional Requirements

1. Username/Password Registration
   - Collect: `username`, `email`, `password` (+ optional `displayName`).
   - Enforce password policy (min length, complexity, breached list check).
   - Email uniqueness + case-insensitive canonicalization.
   - Persist user identity in Kinde; store ancillary profile data internally.
2. Social Login / Registration (Kinde Social Providers)
   - Support at least Google + Discord (extendable list).
   - On first social auth callback: provision new internal user record & profile.
   - On subsequent auth: merge/update profile changes (e.g., avatar, display name) without overwriting user custom fields.
3. Verification Flow (If using email/password)
   - Send verification email via Kinde flow (defer if Kinde handles natively; otherwise integrate transactional email service stub).
   - Mark user as `emailVerified` only after confirmation token validated.
4. Logging
   - Log every registration attempt (without sensitive fields). Include outcome + reason code. Redact PII (hash email for correlation). Never log raw passwords.
5. Error Handling
   - Distinguish: validation errors (400), conflict (409), rate limit (429), server error (500), upstream auth error (502/503 fallback). Return machine-readable `error.code` & `error.message`.
6. Idempotency
   - Repeated social callback within short window should not duplicate users.
   - Provide `Idempotency-Key` header for POST /register to allow safe retries.

## Non-Functional Requirements

- Latency target < 250ms p95 for registration under nominal load.
- Throughput: sustain 50 registrations/minute initially (scalable to 10x).
- Reliability: No single point of failure—external Kinde outage should degrade gracefully (queue retry for non-verified states if applicable).
- Auditability: All create user events produce an immutable audit record (append-only) with correlation ID, timestamp (UTC ISO 8601), and request origin.

## Services & Responsibilities

| Service                       | Responsibility                                               | Data Owned                         |
| ----------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| identity-service              | Registration endpoints, Kinde integration, credential policy | Identity keys, minimal linkage IDs |
| profile-service               | User profile fields (avatar, displayName, preferences)       | Profile document                   |
| audit-log-service             | Append-only audit trail                                      | Audit events                       |
| notification-service (future) | Email/SMS outbounds                                          | Message records                    |

## Data Model Sketch (Internal)

```
UserCore {
  id: UUID
  kindeUserId: string
  email: string (canonical lower-case)
  username: string (unique, optional if social only)
  authProvider: enum [PASSWORD, GOOGLE, DISCORD, OTHER]
  emailVerified: boolean
  createdAt: datetime
  updatedAt: datetime
  status: enum [ACTIVE, PENDING_VERIFICATION, LOCKED]
}
UserProfile {
  userId: UUID (FK)
  displayName: string
  avatarUrl: string
  timezone: string
  preferences: jsonb
  lastLoginAt: datetime
}
AuditEvent {
  id: UUID
  userId: UUID (nullable for pre-provision events)
  type: enum [REGISTRATION_ATTEMPT, REGISTRATION_SUCCESS, REGISTRATION_FAILURE, SOCIAL_LINK, EMAIL_VERIFICATION_SENT, EMAIL_VERIFICATION_CONFIRMED]
  correlationId: string
  timestamp: datetime
  actorIp: string
  details: jsonb (redacted)
}
```

## Endpoints (identity-service)

| Method | Path                            | Description                      | Auth   | Rate Limit           |
| ------ | ------------------------------- | -------------------------------- | ------ | -------------------- |
| POST   | /v1/auth/register               | Username/password registration   | Public | Yes (e.g., 5/min/IP) |
| POST   | /v1/auth/social/callback        | Social provider callback handler | Public | Provider throttling  |
| GET    | /v1/auth/verify-email?token=... | Email verification               | Public | Low                  |
| GET    | /v1/auth/availability?username= | Check username availability      | Public | Moderate             |
| GET    | /v1/auth/availability?email=    | Check email availability         | Public | Moderate             |

### Request Contracts

POST /v1/auth/register

```
Headers: Idempotency-Key (optional), X-Correlation-Id (client-supplied or generated)
Body: {
  "username": "string", // required unless social-only path used
  "email": "string", // required
  "password": "string", // required
  "displayName": "string" // optional
}
```

Responses:

- 201 Created: `{ "id": "UUID", "status": "PENDING_VERIFICATION" }`
- 400 Validation: `{ "error": { "code": "INVALID_PASSWORD", "message": "..." } }`
- 409 Conflict: `{ "error": { "code": "EMAIL_IN_USE" } }`
- 429 Rate Limit: `{ "error": { "code": "RATE_LIMIT" } }`

### Social Callback Flow

1. Provider redirects with code/state.
2. Exchange code via Kinde SDK (secure server-side).
3. Extract identity (email, displayName, avatar provider-specific). If existing user: update lastLoginAt & optionally avatar (if user has not overridden).
4. If new: create UserCore (ACTIVE) & UserProfile, emit REGISTRATION_SUCCESS audit.
5. Return JWT (handled by Kinde) or token metadata. Return 200 + user summary.

## Kinde Integration Notes

- Use official Kinde server-side SDK.
- Store only `kindeUserId` + necessary claims snapshot (avoid duplication of identity data).
- Validate JWT signatures and exp, iat, iss on every protected request.
- For password registration rely on Kinde's secure storage; DO NOT store raw passwords internally.

## Logging & Observability

- Use structured logging (JSON) fields: `timestamp`, `level`, `service`, `correlationId`, `event`, `userId?`, `provider?`, `outcome`, `latencyMs`.
- Emit metrics: `registration_attempts_total`, `registration_success_total`, `registration_failure_total`, `registration_latency_ms` histogram.
- OpenTelemetry traces: root span `registration` with child spans `validate_input`, `kinde_signup`, `persist_user`, `emit_audit`.

## Validation Rules

- Username: 3–32 chars, alphanumeric + underscore, no leading underscore.
- Email: RFC 5322 basic format, lowercase canonicalization.
- Password: ≥12 chars, at least 3 of 4 classes (upper, lower, digits, symbols), reject from compromised list (e.g., HaveIBeenPwned API or static bloom filter stub for MVP).

## Rate Limiting Strategy

- Sliding window or token bucket per IP + per email for registration.
- Distinct counters for social callbacks to avoid accidental provider throttling.

## Edge Cases

- Social provider returns missing email (request user to supply via UI).
- Race condition where same email registers via social + password concurrently (resolve by unique constraint; second wins by linking accounts or returning conflict).
- Duplicate social callback replays (validate state token; idempotent).
- Email verification token expired (allow reissue endpoint later).

## Security Considerations

- Enforce HTTPS only; reject insecure origins.
- Set Secure + HttpOnly on any cookies if used (prefer token-based).
- CSRF not required for pure API token flows; ensure anti-CSRF if any form posts without tokens.
- Store minimal PII; redact user email in audit `details` (e.g., SHA256(email + salt)).

## Acceptance Criteria

1. Can register via username/password and receive 201 with pending status.
2. Duplicate email returns 409.
3. Social login creates or reuses user appropriately (idempotent) and returns 200.
4. All registration attempts produce audit events.
5. Logs contain correlationId and no sensitive information (password, full email).
6. Metrics/traces visible for registration path.
7. Password policy enforced; weak password returns 400 with appropriate code.
8. Rate limits enforced (returns 429 after exceeding threshold).

## Test Plan (High-Level)

- Unit: Validation utils (password, email), user provisioning logic, Kinde adapter mock.
- Integration: POST /register success, conflict, weak password, rate limit.
- Integration: Social callback new user vs existing user.
- Security: Ensure no password or raw email in logs (inspect log emitter mock).
- Performance: Simulate 50 registrations/min ensure p95 < target.

## Mock/Stubs for MVP

- Breached password check: static bloom filter stub (deferred external API integration).
- Email verification: stub endpoint logging event; full flow deferred if Kinde native simplifies.

## Implementation Sequence

1. Define data models + persistence layer contracts.
2. Implement validation + policy module.
3. Integrate Kinde signup/login flows (server SDK wrapper).
4. Build registration & availability endpoints.
5. Implement audit events + structured logging.
6. Add metrics & traces instrumentation.
7. Add rate limiting middleware.
8. Create test suites (unit + integration) & ensure coverage for acceptance criteria.
9. Document in API spec + README.

## Definition of Done

- All acceptance criteria met.
- Tests passing with ≥80% coverage for registration path.
- Observability (logs, metrics, traces) verified in local environment.
- Security review checklist cleared for MVP scope.
- Prompt and API docs committed.

---

Provide implementation in language(s) selected for the backend (e.g., Node.js + TypeScript or Go) following existing project conventions. Focus on clean separation of concerns and future extensibility for multi-factor authentication.
