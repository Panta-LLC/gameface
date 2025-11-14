# Implementation Prompt – Task: Logout Functionality (Epic 1: User Authentication & Session Management)

## Context

This task provides secure, auditable logout functionality for GameFace across all authentication flows (username/password and social via Kinde). Logout must reliably terminate the user's active authentication context (single session or all sessions), prevent token reuse, and integrate with the session persistence design.

## Objectives

- Support single-session logout and global logout (all devices).
- Ensure revoked refresh tokens cannot obtain new access tokens.
- Provide clear audit trail, logs, metrics, and traces for each logout action.
- Integrate gracefully with Kinde (token revocation endpoints if available) and internal session store.
- Enforce idempotent operations (repeat logout yields same final state without error).

## Functional Requirements

1. Logout (Single Session)
   - Accept access token or sessionId (derived from context) to revoke associated refresh token + mark session as REVOKED.
2. Logout All Sessions
   - Invalidate all active sessions for a user (session store cleanup + revocation sets) by either iterating sessions or bumping global session version.
3. Token Revocation
   - Hash refresh token and insert into `revoked:refresh:<hash>` set; optionally call Kinde revocation API.
4. Idempotency
   - Re-logout of already revoked session returns 200 with status indicating already logged out.
5. Cascade Effects
   - After logout, subsequent refresh attempts return 401.
   - Access tokens may remain valid until expiry unless short-lived; optional immediate access token revocation for high-security contexts.
6. UI Signaling
   - Endpoint responses provide canonical state: `{ "status": "LOGGED_OUT" }` or aggregated summary for multi-logout.

## Endpoints (identity-service)

| Method | Path                | Description                                        |
| ------ | ------------------- | -------------------------------------------------- |
| POST   | /v1/auth/logout     | Logout current session (uses Authorization header) |
| POST   | /v1/auth/logout/all | Logout all sessions for current user               |

### POST /v1/auth/logout

Request Headers:

- Authorization: Bearer accessToken
- X-Correlation-Id (optional)
  Response:
- 200: `{ "status": "LOGGED_OUT", "sessionId": "UUID" }`
- 200 (Idempotent repeat): `{ "status": "ALREADY_LOGGED_OUT" }`
- 401 (Invalid token): `{ "error": { "code": "UNAUTHORIZED" } }`

### POST /v1/auth/logout/all

Response:

- 200: `{ "status": "ALL_SESSIONS_LOGGED_OUT", "revokedCount": 5 }`

## Flow Details

1. Extract & validate access token (signature, claims).
2. Derive sessionId (from custom claim or session store lookup using token hash).
3. Mark session REVOKED; add refresh token hash to revocation set.
4. Emit audit event(s): SESSION_REVOKED or SESSION_REVOKED_ALL.
5. Log structured event with correlationId & outcome.
6. Return idempotent response.

## Logging

Events:

- `logout.request`
- `logout.success`
- `logout.repeat`
- `logout.all`
  Fields: `timestamp`, `level`, `service`, `event`, `userId`, `sessionId?`, `revokedCount?`, `correlationId`, `latencyMs`.
  PII scrubbing: no raw token, no IP unless needed (optional include sanitized IP).

## Metrics

- `logout_requests_total`
- `logout_success_total`
- `logout_all_requests_total`
- `logout_all_success_total`
- `logout_latency_ms` (histogram)
- `sessions_revoked_total`

## Tracing

Root spans:

- `auth.logout`
- `auth.logout_all`
  Child spans: `validate_token`, `lookup_session`, `revoke_session(s)`, `audit_emit`, `persist_changes`.

## Audit Events

- SESSION_REVOKED: { sessionId, reason: "USER_LOGOUT" }
- SESSION_REVOKED_ALL: { revokedCount, reason: "USER_LOGOUT_ALL" }
  Include correlationId, timestamp, userId.

## Security Considerations

- Ensure constant response time for already logged out vs active session to avoid enumeration.
- Prevent race conditions: atomic mark + revocation registration (use Redis transactions or Lua script for multi-step changes).
- All revocation operations resilient to partial failures (retry or fallback to version bump for logout-all).
- Protect against refresh token theft: rotation logic from session persistence ensures minimal reuse window.

## Edge Cases

- Logout with expired access token -> 401 (no side effects).
- Logout-all while some sessions concurrently refreshing: refresh sees revoked state -> 401.
- Duplicate logout-all requests: second returns same status with current revokedCount = 0 increment.
- Session absent (not found) -> treat as idempotent already logged out.

## Implementation Steps

1. Extend session store with efficient sessionId -> record retrieval by access token hash.
2. Implement single logout endpoint: validation, revoke refresh, mark session, emit audit/log/metrics.
3. Implement logout-all: gather sessions (or bump version), revoke refresh tokens, mark all, produce summary metrics.
4. Add idempotency checks (session status REVOKED).
5. Add structured logging + tracing instrumentation.
6. Add metrics counters/histograms.
7. Write unit tests (revocation logic, idempotent behavior, version bump).
8. Write integration tests (single logout success, repeat, logout-all with multiple sessions, refresh post-logout returns 401).
9. Document endpoint usage & expected client flows.

## Acceptance Criteria

1. Single logout revokes refresh token and returns LOGGED_OUT.
2. Repeat single logout returns ALREADY_LOGGED_OUT without error.
3. Logout-all revokes all sessions; subsequent list (if implemented) empty.
4. Refresh after logout returns 401.
5. Audit events emitted for every logout action.
6. Logs contain correlationId & outcome; no raw tokens.
7. Metrics & traces visible for logout flows.
8. Atomic behavior: no partial revocation on logout-all in normal operation.

## Test Plan

Unit:

- Revoke logic, idempotent repeat, version bump strategy.
- Atomic multi-session revocation (simulate partial failure fallback).
  Integration:
- Single logout -> status -> repeat.
- Create multiple sessions -> logout-all -> verify refresh fails.
- Concurrent refresh & logout-all race resolution.
  Security:
- Ensure no leakage of session existence via timing differences.
- Attempt logout with altered token -> 401 (no side effects).
  Performance:
- Measure logout-all for 50 sessions < threshold latency (e.g., 200ms p95).

## Definition of Done

- Endpoints implemented with tests passing.
- Observability validated (logs, metrics, traces).
- Audit entries confirmed.
- Documentation updated.
- No sensitive data exposed in logs/audit.

---

Implement using backend stack conventions. Prepare for future enhancements: selective device logout (except current), risk-driven forced global logout, admin-initiated revocations.
