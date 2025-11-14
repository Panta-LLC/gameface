# Implementation Prompt – Audio & Video Controls

## Context

Provide responsive and privacy-safe controls for microphone and camera during a live WebRTC call, including device selection and hot-swapping without renegotiation when possible.

## Objectives

- Mute/unmute audio; camera on/off with local preview sync.
- Switch input devices (mic/camera) during active calls with minimal disruption.
- Visual indicators for local/remote mute state and connectivity.

## UX & Behavior

- Local controls reflect immediately; remote sees state within <300ms.
- Persist last-used devices; restore on next call if available.
- Display permission status and guidance if denied.

## Technical Requirements

- Use `MediaStreamTrack.enabled` for mute; replaceTrack for device switching.
- Apply constraints: echoCancellation, noiseSuppression, autoGainControl.
- Ensure privacy: no auto-enable camera/mic without explicit consent.
- Handle background tab throttling; keep signaling for state updates.

## Logging & Metrics

- Logs: `av.mute`, `av.unmute`, `av.camera_on`, `av.camera_off`, `av.device_switch`.
- Metrics: `mute_toggles_total`, `device_switch_total`, `constraint_errors_total`.
- Traces: spans around `replace_track` and constraint application.

## Acceptance Criteria

- Mute/unmute and camera toggle work reliably with remote state updates.
- Device switching does not drop the call; video freeze < 1s during switch.
- Constraints applied (AEC/NS/AGC) and verifiable via track settings.

## Test Plan

- Unit: control state store & UI actions.
- Integration: E2E toggle tests with fake devices; device switch mid-call.
- Accessibility: keyboard operability, focus management, screen reader labels.

## Implementation Steps

1. Control state machine + UI components.
2. Track management (enable/disable, replaceTrack, constraints).
3. Remote signaling for state hints (optional DataChannel or app signal event).
4. Persist device IDs securely.
5. Tests + telemetry instrumentation.
