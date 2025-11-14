# Implementation Prompt – Task: Session Persistence (Epic 1: User Authentication & Session Management)

## Context

This task delivers robust session persistence for GameFace. The platform uses Kinde for identity (JWT access/id/refresh tokens). We must support stateless verification while enabling controlled revocation, device awareness, concurrency limits, and observability. Persistence layer must scale horizontally and survive restarts without breaking active sessions.

## Objectives

- Provide reliable token lifecycle management (issue, validate, refresh, revoke).
- Support multi-device sessions (track each device/browser context).
- Enable server-side invalidation (logout-all, targeted revocation) despite JWT stateless nature via a revocation & allowlist strategy.
- Supply structured logging, metrics, and traces for session operations.
- Enforce security constraints: refresh rotation, inactivity timeout, absolute max lifetime, anomaly flagging.

## Architectural Approach

1. Primary Auth: Kinde handles credential validation and issues tokens.
2. Session Index Store: Maintain per-user session metadata (not storing raw tokens) in fast, durable store (Redis or DynamoDB-like; choose Redis for MVP with RDB snapshot for recovery).
3. Revocation Strategy:
   - Maintain `revokedRefreshTokens` set keyed by token hash.
   - Maintain `userSessionVersion` counter; embed version in custom token claim (if Kinde extensible) or track per-session; any mismatch -> invalid.
   - For access token immediate revocation: maintain short-lived `revokedAccessTokens` set (TTL <= access token expiry). Usually rely on refresh revocation boundary; access token revocation optional for high-risk events.
4. Session Validation:
   - Validate JWT signature & standard claims.
   - Check token hash absence in revoked sets.
   - Check session record active + not expired.
5. Refresh Flow:
   - On refresh: rotate refresh token; add old token hash to revoked set; update session metadata lastRefreshedAt.
   - Enforce max absolute lifetime (e.g., 30 days) or inactivity timeout (e.g., 7 days no refresh).
6. Device Tracking:
   - Each session has `deviceId` (generated client-side or UUID fallback), `userAgent`, `ip`, `createdAt`, `lastSeenAt`.
7. Concurrency Controls:
   - Limit active sessions per user (e.g., 10). On exceeding: revoke oldest or return error with guidance.
8. Persistence Model (Redis Keys):

```
user:sessions:<userId> = [ JSON session objects ] // or hash per sessionId
session:<sessionId> = { userId, deviceId, createdAt, lastSeenAt, lastRefreshedAt, expiresAt, version }
revoked:refresh:<hash> = true (TTL until natural expiry + grace)
revoked:access:<hash> = true (optional)
user:sessionVersion:<userId> = int (if global version invalidation needed)
```

Token hashes: `SHA256(token + pepper)` – never store raw token.

## Data Model (Internal Types)

```
SessionRecord {
  sessionId: UUID
  userId: UUID
  deviceId: string
  userAgent: string
  ip: string
  createdAt: datetime
  lastSeenAt: datetime
  lastRefreshedAt: datetime
  expiresAt: datetime
  absoluteExpiresAt: datetime
  status: enum [ACTIVE, REVOKED, EXPIRED]
  version: int // increment on rotation if needed
}
```

## Endpoints (identity-service additions)

| Method | Path                         | Description                         |
| ------ | ---------------------------- | ----------------------------------- |
| GET    | /v1/sessions                 | List current user's active sessions |
| POST   | /v1/sessions/refresh         | Refresh tokens (rotation)           |
| DELETE | /v1/sessions/:sessionId      | Revoke specific session             |
| DELETE | /v1/sessions                 | Revoke all sessions (logout-all)    |
| PATCH  | /v1/sessions/:sessionId/ping | Update lastSeenAt (heartbeat)       |

### GET /v1/sessions

Response: `200 [{ sessionId, deviceId, createdAt, lastSeenAt, ip, expiresAt }]`

### POST /v1/sessions/refresh

Request: `{ refreshToken: "string" }`
Responses:

- 200: `{ accessToken, idToken, refreshToken, session: { sessionId, expiresAt } }`
- 401 (invalid/revoked/expired): `{ error: { code: "INVALID_REFRESH_TOKEN" } }`
- 409 (max lifetime exceeded): `{ error: { code: "SESSION_EXPIRED_ABSOLUTE" } }`

### DELETE /v1/sessions/:sessionId

- Marks session REVOKED, adds refresh hash to revoked set.

### DELETE /v1/sessions

- Increments `userSessionVersion` (if used), revokes all sessions.

### PATCH /v1/sessions/:sessionId/ping

- Update `lastSeenAt`; optional for long-lived open connections.

## Logging

Structured events:

- `session.create`
- `session.refresh`
- `session.revoke`
- `session.revoke_all`
- `session.list`
- `session.expire` (background cleanup)
  Fields: `timestamp`, `level`, `service`, `event`, `userId`, `sessionId`, `deviceId`, `ip`, `outcome`, `latencyMs`.
  Never log raw tokens; use hashed identifiers.

## Metrics

- `sessions_active_total` (gauge; derived)
- `session_refresh_attempts_total` / `session_refresh_success_total` / `session_refresh_failure_total`
- `session_revoke_total`
- `session_lifetime_seconds` (histogram of (expiresAt - createdAt))
- `session_refresh_latency_ms`

## Tracing

Spans:

- `session.refresh` -> child: `validate_token`, `lookup_session`, `rotate_refresh`, `persist`, `emit_audit`
- `session.revoke`
- `session.list`

## Audit Events

Types:

- SESSION_CREATED
- SESSION_REFRESHED
- SESSION_REVOKED
- SESSION_REVOKED_ALL
- SESSION_EXPIRED
  Audit payload excludes token info; includes `sessionId`, `deviceId`, `ip`, `userAgent (truncated)`, `reason`.

## Validation & Rules

- Refresh token mandatory for refresh endpoint.
- Session expiration logic: `expiresAt = lastRefreshedAt + accessLifetime?` (Access tokens separate). For refresh-based session: sliding window inactivity (e.g., 7d) + absolute lifetime (30d).
- Device ID length & character sanity (UUID or short slug). Fallback generate if missing.
- IP recorded only for coarse security analysis (store IPv4/IPv6 canonical). Optional anonymization (/24 or /64).

## Security Considerations

- Use constant-time hash comparisons for token revocation checks.
- Protect Redis with TLS + auth; do not allow cross-tenant leakage.
- Rate-limit refresh endpoint (e.g., 30/min per session) to prevent brute-force.
- Invalidate all sessions upon critical security events (password change, suspected compromise) by global version bump.

## Edge Cases

- Refresh after session revoked -> 401.
- Concurrent refresh race: allow one winner; losing refresh sees revoked old token -> 401; advise client to retry login.
- Device list retrieval after mass revocation -> returns empty set.
- Expired session cleanup misses record (stale) -> background janitor marks EXPIRED on scan.

## Implementation Steps

1. Define session data structures & Redis key strategy.
2. Implement hashing utility for tokens (use pepper from config/secret manager).
3. Build session create logic in login flow (integrate with GAM-3).
4. Implement refresh endpoint (rotation + revocation registration).
5. Implement revoke single & revoke-all endpoints.
6. Implement list & ping endpoints.
7. Add logging, metrics, tracing instrumentation.
8. Add audit emission hooks.
9. Write unit tests (hashing, revocation logic, rotation, lifetime enforcement).
10. Write integration tests (refresh success, revoked refresh, revoke-all, list sessions).
11. Add background janitor (cron or scheduled) for expiration marking & metrics.
12. Document API & operational procedures.

## Acceptance Criteria

1. New login creates session record with correct fields.
2. Refresh rotates token; old refresh token rejected on subsequent use.
3. Single session revoke prevents further refresh for that session only.
4. Revoke-all invalidates all user sessions immediately.
5. List returns accurate active sessions (post-revoke & post-expiration).
6. No raw tokens logged/audited.
7. Metrics & traces visible locally for session operations.
8. Expired sessions are cleaned within configured interval (e.g., <5m).

## Test Plan

Unit:

- Hashing & revocation set logic.
- Lifetime enforcement (inactivity + absolute).
- Version bump global revoke.
  Integration:
- Create -> Refresh -> Revoke -> Refresh (expect 401).
- Multiple sessions concurrency limit enforcement.
- Revoke-all then list (empty).
  Performance:
- Simulate 100 concurrent refresh requests; ensure no race dup sessions; measure p95 latency.
  Security:
- Ensure token hash collisions improbable; pepper required.
- Ensure no session persists after revoke-all (validate).

## Definition of Done

- All endpoints implemented; tests pass.
- Observability (logs/metrics/traces) validated.
- Documentation updated.
- Security checklist passed (no sensitive logging, proper revocation, concurrency limit enforced).

---

Produce implementation in chosen backend stack adhering to existing module boundaries. Prepare for future enhancements: MFA binding, risk scoring, session anomaly detection, device trust levels.
