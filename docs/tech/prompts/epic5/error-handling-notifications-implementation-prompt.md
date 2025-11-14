# Implementation Prompt – Error Handling & Notifications

## Context
Provide clear, non-blocking error handling and actionable notifications across the app.

## Objectives
- Unified error model (maps from API/WebRTC/signaling to user-friendly messages).
- Non-intrusive toasts, inline errors, and retry affordances.
- Central logging with redaction; error boundary for UI crashes.

## Error Taxonomy
- Network: offline, timeout, 5xx → suggest retry/backoff.
- Auth: expired/invalid token → prompt re-auth.
- Media: permission denied, device unavailable, ICE failed → guidance.
- Validation: form field errors with per-field messages.

## Patterns
- Global error boundary routes to fallback UI; capture to monitoring.
- Toast service with priority levels; dedupe identical messages.
- Retry buttons on transient errors; backoff and jitter.

## Observability
- Structured logs: `ui.error`, `toast.show`, `retry.click`.
- Metrics: `errors_total{type}`, `toasts_shown_total`, `retries_total`, `recovered_total`.
- Traces: spans for critical flows that error (join call, start game).

## Acceptance Criteria
- Users receive human-readable guidance for common failures.
- Transient issues offer retry; permanent issues link to help.
- No PII in logs; error rates visible in dashboards.

## Test Plan
- Unit tests for error mappers and toast dedupe.
- Integration tests: simulate API 401/500, media permission denial.
- E2E: network toggle, token expiry, ICE failure path.
