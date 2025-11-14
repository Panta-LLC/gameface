# Implementation Prompt – Connection Stability & Error Handling

## Context

Ensure resilient media sessions that recover from transient failures (Wi‑Fi roam, network loss, NAT rebinding) and provide clear user feedback.

## Objectives

- Detect connectivity problems quickly and attempt recovery (ICE restart, renegotiation).
- Backoff strategy for retries; bound total recovery time.
- Telemetry and user-facing indicators for degraded/failed states.

## Detection & Recovery

- Monitor `iceConnectionState`, `connectionState`, `signalingState`.
- On `disconnected` -> start timed recovery; on `failed` -> immediate ICE restart.
- Implement network-change listener (e.g., `navigator.connection` where available) to trigger proactive restart.
- If repeated failures -> fallback to TURN-only config.

## Backoff & Limits

- Exponential backoff with jitter: 1s, 2s, 4s, 8s (max 5 attempts).
- Cap total recovery window (e.g., 30s) then surface failure and suggest rejoin.

## Error Taxonomy

- `SIGNALING_TIMEOUT`, `SDP_NEGOTIATION_ERROR`, `ICE_GATHERING_TIMEOUT`, `ICE_FAILED`, `MEDIA_DEVICE_ERROR`.
- Map to user messages and developer logs (machine-readable codes).

## Logging & Metrics

- Logs: `reconnect.attempt`, `reconnect.success`, `reconnect.failure`, `ice.restart`.
- Metrics: `reconnect_attempts_total`, `reconnect_success_rate`, `time_to_recover_ms` histogram.
- Traces: spans for each recovery cycle and ICE restart.

## Acceptance Criteria

- Transient disconnects auto-recover within 10s p95.
- After 5 failed attempts or 30s, user sees actionable error and rejoin option.
- TURN fallback increases success rate in NAT-restricted tests.

## Test Plan

- Simulate network down/up; verify recovery time and metrics.
- Force ICE failure (block UDP); verify TURN fallback and success rate.
- Induce SDP negotiation conflict; ensure retry handles glare (polite peer algorithm).

## Implementation Steps

1. Connection state observer module + event bus.
2. Recovery controller (policy, timers, backoff, limits).
3. ICE restart and renegotiation helpers.
4. User feedback components (toasts/banners) with machine-readable error codes.
5. E2E tests for typical failure modes + metrics assertions.
