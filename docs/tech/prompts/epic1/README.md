# Epic 1 – User Authentication & Session Management

This folder covers Epic 1 for GameFace: secure user registration and login with Kinde, robust session persistence, and logout flows. It consolidates the key decisions, endpoints, and quality bars for auth.

Scope (MVP):

- Registration: username/password and social (Google, Discord via Kinde).
- Login: password and social providers, token refresh, lockout, rate limiting.
- Session Persistence: multi-device sessions, refresh rotation, revocation, listing.
- Logout: single-session and global (all devices), idempotent.

---

## High-Level Architecture

```
Frontend (Web/App)
  ├─ Auth UI (register, login, social redirect)
  ├─ Token handling (access/id/refresh)
  └─ Session UX (status, device list, logout)

Identity Service
  ├─ /v1/auth/* endpoints
  ├─ Kinde SDK integration
  ├─ Lockout + rate limiting
  └─ Audit + observability hooks

Session Store (Redis)
  ├─ Session records (no raw tokens)
  ├─ Revocation sets (hashed tokens)
  └─ Version bump for logout-all

Audit Log Service
```

Design Principles: stateless JWT auth, least privilege, strong observability, privacy by default, revocation-capable sessions.

---

## Endpoint Catalog

| Group        | Method | Path                               | Purpose                         | Auth    | Rate Limit          |
| ------------ | ------ | ---------------------------------- | ------------------------------- | ------- | ------------------- |
| Registration | POST   | /v1/auth/register                  | Create user (username/password) | Public  | Yes                 |
| Availability | GET    | /v1/auth/availability?username=    | Check username                  | Public  | Moderate            |
| Availability | GET    | /v1/auth/availability?email=       | Check email                     | Public  | Moderate            |
| Social       | GET    | /v1/auth/social/:provider/start    | Begin social auth               | Public  | Moderate            |
| Social       | GET    | /v1/auth/social/:provider/callback | OAuth callback                  | Public  | Provider throttling |
| Login        | POST   | /v1/auth/login                     | Password login                  | Public  | Yes                 |
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

## Security & Privacy

- Kinde as the identity provider; validate JWTs on every request.
- Password policy (length, complexity, breached list) and email canonicalization.
- Lockout after repeated failures; constant-time failure responses to avoid enumeration.
- Rate limit login/register/refresh; per-IP and per-identifier controls.
- Refresh rotation + revocation sets; store only hashed tokens (SHA256 + pepper).
- HTTPS-only; no sensitive data in logs (no raw email/password/tokens).

---

## Observability

- Logs (JSON): `registration.*`, `login.*`, `session.*`, `logout.*` with correlationId.
- Metrics: attempts/success/failure counters, lockouts, sessions gauge, latency histograms.
- Tracing: spans for validate -> provider -> persist -> audit across all auth flows.

---

## Acceptance Criteria (Aggregate)

- Users can register (password + social) and log in successfully.
- Duplicate email/username conflicts return correct 409 errors.
- Token refresh rotates refresh tokens; old tokens rejected.
- Session list/revoke and logout-all behave per spec.
- Lockout and rate limiting enforced and observable.
- No sensitive data appears in logs or audit payloads.

---

## Implementation Prompts

Prompts in this repository:

- In this folder (if present):
  - `user-login-implementation-prompt.md`
- Central tech prompts:
  - `../../user-registration-implementation-prompt.md`
  - `../../user-login-implementation-prompt.md`
  - `../../user-session-persistence-implementation-prompt.md`
  - `../../user-logout-implementation-prompt.md`
- Consolidated spec: `../../auth/README.md`

Use these as the canonical guidance when implementing services and tests.

---

## Notes

- Social providers: start with Google and Discord; keep provider list extensible.
- Consider device trust and MFA in future phases (roadmap in auth/README).
- Keep session store and audit service horizontally scalable and fault-tolerant.
