# Implementation Prompt: GAM-3 – Implement User Login (Service-Oriented Architecture)

## Context

Task `GAM-3` delivers the User Login capability for GameFace within the service-oriented architecture. It must support username/password and social login (Google, Discord, etc.) via Kinde. This builds upon GAM-2 (registration) and introduces secure authentication flows, token refresh, logout, and account protection measures.

## Objectives

- Provide low-latency, secure login endpoints integrated with Kinde.
- Support both password-based and social provider authentication.
- Enforce security controls: rate limiting, lockout, anomaly detection, audit trails.
- Deliver full observability: structured logging, metrics, tracing.
- Maintain strict separation of concerns across services (`identity-service`, `audit-log-service`, `profile-service`).

## Architectural Principles

1. Stateless Auth: Rely on Kinde-issued JWTs (access, ID, refresh). No server-side session store beyond ephemeral cache for token introspection (optional).
2. Least Privilege: Validate token scopes before granting access to protected resources.
3. Idempotent & Safe: Login requests are side-effect minimal beyond audit entries and lastLoginAt updates.
4. Resilient: Degrade gracefully if Kinde is temporarily unavailable (circuit breaker + clear error semantics). No partial authentication states.

## Functional Requirements

1. Username/Password Login
   - Accept `email` or `username` + `password`.
   - Validate credentials via Kinde server SDK.
   - Return access + ID + refresh token set (or token metadata handled by Kinde front-channel, depending on chosen flow).
2. Social Login
   - Provider redirect (OAuth/OpenID Connect) -> server-side exchange -> user provisioning (if first time) -> token issuance.
   - Support Google & Discord at MVP (extensible).
3. Token Refresh
   - Endpoint to exchange valid refresh token for new access/ID tokens.
   - Enforce refresh token rotation (invalidate old token where applicable) and detect replay.
4. Logout
   - Invalidate / revoke refresh token (best-effort; password + social flows). If Kinde supports revocation API, call it; else rely on expiration window.
5. Account Lockout
   - Threshold: e.g., 5 failed password attempts in 15 minutes -> temporary lock (15 minutes). Store counters in a fast store (Redis) keyed by user/email.
6. Rate Limiting
   - IP-based + user/email-based token bucket for login attempts. Separate buckets for password vs social callbacks.
7. Audit Trail
   - Event types: LOGIN_ATTEMPT, LOGIN_SUCCESS, LOGIN_FAILURE, TOKEN_REFRESH, LOGOUT, ACCOUNT_LOCKED.
   - No sensitive data (no password). Redact email (hash).
8. Anomaly Detection (MVP Stub)
   - Flag login attempt if geo distance or device fingerprint drastically changes (store last known metadata; logic stubbed for later enhancement).
9. Last Login Update
   - On successful login, update `UserProfile.lastLoginAt`.

## Non-Functional Requirements

- p95 latency < 200ms for password login under nominal load.
- Consistent error taxonomy (machine-readable codes) for automation.
- Observability coverage: 100% of auth flows traced.
- Resilience: External auth provider outage returns 503 with `AUTH_PROVIDER_UNAVAILABLE` code (no ambiguous states).

## Services

| Service              | Responsibility                                                                  |
| -------------------- | ------------------------------------------------------------------------------- |
| identity-service     | Login endpoints, token refresh, logout, lockout logic, rate limiting middleware |
| audit-log-service    | Persist audit events                                                            |
| profile-service      | Maintain & update lastLoginAt timestamp                                         |
| risk-engine (future) | Advanced anomaly & fraud detection                                              |

## Endpoint Specifications (identity-service)

| Method | Path                               | Description                               | Auth                   | Rate Limit            |
| ------ | ---------------------------------- | ----------------------------------------- | ---------------------- | --------------------- |
| POST   | /v1/auth/login                     | Username/email + password login           | Public                 | Yes (e.g., 10/min/IP) |
| GET    | /v1/auth/social/:provider/start    | Initiate social login (redirect)          | Public                 | Moderate              |
| GET    | /v1/auth/social/:provider/callback | Handle social provider callback           | Public                 | Provider throttling   |
| POST   | /v1/auth/token/refresh             | Refresh tokens using refresh token        | Public (Refresh token) | Strict                |
| POST   | /v1/auth/logout                    | Revoke refresh token / logout             | Bearer (access)        | Moderate              |
| GET    | /v1/auth/status                    | Return current authenticated user summary | Bearer                 | Low                   |

### POST /v1/auth/login

Request:

```
Headers: X-Correlation-Id (optional)
Body: {
  "identifier": "string", // email or username
  "password": "string"
}
```

Responses:

- 200 OK: `{ "accessToken": "...", "idToken": "...", "refreshToken": "...", "user": { "id": "UUID", "displayName": "..." } }`
- 400 Validation: `{ "error": { "code": "INVALID_INPUT", "message": "identifier required" } }`
- 401 Unauthorized: `{ "error": { "code": "BAD_CREDENTIALS" } }`
- 423 Locked: `{ "error": { "code": "ACCOUNT_LOCKED", "retryAfterSec": 900 } }`
- 429 Rate Limit: `{ "error": { "code": "RATE_LIMIT" } }`
- 503 Provider Down: `{ "error": { "code": "AUTH_PROVIDER_UNAVAILABLE" } }`

### POST /v1/auth/token/refresh

Request:

```
Body: { "refreshToken": "string" }
```

Responses:

- 200 OK: New token set (with rotated refresh token if applicable).
- 401 Invalid/Expired: `{ "error": { "code": "INVALID_REFRESH_TOKEN" } }`
- 429 Rate Limit: repeated rapid refresh attempts.

### POST /v1/auth/logout

- Accept either refresh token or rely on current access token to identify session.
- Revoke tokens where supported; else record logout timestamp.

### GET /v1/auth/status

- Returns minimal user session info (id, displayName, scopes, lastLoginAt). Uses access token introspection.

## Data Model Additions

Add fields:

- UserCore.failedLoginAttempts (transient counter stored in Redis, not persisted long-term)
- UserCore.lockedUntil (timestamp when lock expires)
- AuditEvent.type additions for login lifecycle.

## Logging (Structured JSON)

Fields: `timestamp`, `level`, `service`, `event`, `correlationId`, `userId?`, `provider?`, `identifierHash`, `outcome`, `latencyMs`, `lockoutState?`.
Events:

- `login.attempt`
- `login.success`
- `login.failure`
- `login.locked`
- `token.refresh`
- `logout.request`

Never log raw identifier or tokens. Hash identifier: `SHA256(lowercaseEmail + pepper)`.

## Metrics

- `login_attempts_total`
- `login_success_total`
- `login_failures_total`
- `login_latency_ms` (histogram)
- `login_lockouts_total`
- `token_refresh_total`
- `logout_total`

## Tracing (OpenTelemetry)

Root span: `auth.login`
Child spans: `validate_input`, `kinde_authenticate`, `lockout_check`, `audit_emit`, `profile_update`.
Similarly for refresh: `auth.refresh` and logout: `auth.logout`.

## Validation

- Identifier: if email, RFC basic; if username, match regex from registration (3–32, alnum + underscore, no leading underscore).
- Password: not empty; any complexity rejections delegated to Kinde.
- Provider: whitelisted set for social.

## Rate Limiting & Lockout Interaction

Flow:

1. Increment attempt counter early.
2. If account locked -> respond 423.
3. If credentials correct -> reset counters + emit success.
4. If failure -> increment failure counter; if threshold reached -> set `lockedUntil` and emit lock event.

## Edge Cases

- Login during lockout window (return 423 consistently).
- Social login with provider returning no email (prompt completion flow; not full login until resolved).
- Refresh token replay (detect previously used token; revoke session; force re-auth).
- Partial outage where token introspection works but new auth fails (report provider unavailable on login only).

## Security Considerations

- All responses constant-time for credential failure vs user not found.
- Avoid user enumeration: identical 401 for bad email vs bad password (lockout still tracked internally per existing user record).
- Refresh token rotation to minimize theft window.
- Short-lived access tokens (e.g., 15m) with refresh token validity (e.g., 7d) configurable.
- Strict HTTPS only.

## Acceptance Criteria

1. Successful password login returns tokens & updates lastLoginAt.
2. Failed password login increments counter; lockout triggers after threshold.
3. Social login returns tokens or initiates profile completion if missing mandatory info.
4. Token refresh returns new valid access token; invalid token yields 401.
5. Logout revokes or invalidates refresh token (subsequent refresh denied).
6. Structured logs emitted for all key events with correlationId.
7. No PII (raw email, password, tokens) in logs or audit details.
8. Rate limits enforced (exceed triggers 429 JSON error) without leaking user existence.
9. Traces & metrics visible locally for all flows.

## Test Plan

Unit Tests:

- Identifier parsing & validation.
- Lockout logic transitions (attempt counting, expiry).
- Refresh token rotation logic.
  Integration Tests:
- Password login success.
- Password login failure -> lockout.
- Social login (mock Kinde) success & replay callback.
- Token refresh success & invalid token.
- Logout then failed refresh.
  Security Tests:
- Ensure constant-time-ish credential failure path (mock time budget).
- Ensure no sensitive tokens in logs (log capture assertions).
  Performance:
- Simulate 100 login attempts/min; p95 < target.

## Implementation Sequence

1. Add lockout + attempt tracking module (Redis adapter).
2. Implement login endpoint (validation, Kinde auth wrapper, lockout logic).
3. Add audit events + structured logging.
4. Add metrics & traces instrumentation.
5. Implement social redirect & callback endpoints.
6. Implement token refresh endpoint.
7. Implement logout endpoint.
8. Integrate rate limiting middleware.
9. Write test suites & achieve coverage goals.
10. Document flows in API spec.

## Definition of Done

- All endpoints implemented & documented.
- Test suite passes; coverage ≥80% for auth logic.
- Observability (logs/traces/metrics) validated.
- Security review items closed (no sensitive logging, proper lockout, rate limit).
- Audit events present for all flows.

---

Implement using backend stack conventions (e.g., Node.js/TypeScript or Go). Ensure extensibility for future MFA, device management, and adaptive risk scoring. Keep modules cohesive: validation/policy, provider integration, token lifecycle, audit & logging, rate limiting.
