# Implementation Prompt – P2P Video Streaming (WebRTC)

## Context

Implement 1:1 peer-to-peer video streaming using WebRTC. This includes media capture, peer connection setup, ICE servers configuration (STUN/TURN), SDP negotiation via a signaling service, and optional data channel for control events.

## Objectives

- Establish reliable 1:1 video call between authenticated users.
- Minimize call setup time and handle NAT traversal using STUN/TURN.
- Provide hooks for stats, logging, and adaptive bitrate.

## Architecture

- Frontend: `RTCPeerConnection`, `getUserMedia`, addTrack, ICE gathering, SDP offer/answer, DataChannel (optional).
- Backend Signaling: WebSocket relay for `join`, `offer`, `answer`, `candidate`, `leave`.
- STUN/TURN: Use managed TURN or coturn (credential rotation). Include multiple STUN servers for reliability.

## Flow

1. User joins room -> signaling notifies peers.
2. Caller creates RTCPeerConnection with ICE servers -> add local tracks.
3. Create offer (setLocalDescription) -> send via signaling.
4. Callee sets remoteDescription, creates answer -> reply via signaling.
5. Exchange ICE candidates until connection state `connected`.
6. On success: start QoS stats polling and expose metrics/logs.

## Configuration

- ICE servers list (env-configured): STUN x2+, TURN with TCP+TLS transports.
- Preferred codecs: H.264 or VP8 baseline for compatibility (configurable).
- Enable `rtcpMuxPolicy: "require"`, `bundlePolicy: "max-bundle"`.
- Consider simulcast/SVC flags for future scalability.

## Error Handling

- Permission denied on media -> prompt retry or fallback device.
- No camera/mic -> show guidance.
- ICE failure -> trigger ICE restart with backoff; optionally fall back to TURN-only.
- SDP incompatibility -> renegotiate with reduced constraints.

## Logging & Metrics

- Logs: `webrtc.offer`, `webrtc.answer`, `webrtc.candidate`, `webrtc.connection_state`, `webrtc.ice_state`.
- Metrics: `call_setup_time_ms` (offer->connected), `ice_restart_total`, `turn_usage_ratio`, `codec_selected_total{codec}`.
- Tracing: spans for `create_offer`, `set_remote`, `ice_gathering`, `ice_connected`.

## Acceptance Criteria

- Two authenticated users can establish a P2P call reliably across NATs.
- Call setup p95 < 3s on typical broadband with working TURN.
- If ICE disconnect occurs, ICE restart succeeds >95% in testing nets.
- Logs/metrics/traces emitted with correlation IDs and no PII.

## Test Plan

- Automated browser tests (Playwright) with `--use-fake-device-for-media-stream` and `--use-fake-ui-for-media-stream`.
- Simulate network drops and measure reconnection.
- Validate fallback to TURN by disabling UDP in test.
- Verify codec negotiation on Chrome/Firefox.

## Implementation Steps

1. Build signaling client hooks and connection lifecycle manager.
2. Implement media capture with constraints + device selection integration.
3. Implement offer/answer & ICE candidate exchange.
4. Add stats polling and emit metrics.
5. Implement ICE restart path with exponential backoff.
6. Write E2E tests with fake devices.
