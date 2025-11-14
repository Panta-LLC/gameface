# Implementation Prompt – WebRTC Performance Tuning

## Context

Tune WebRTC to deliver low-latency, resilient media under varying network conditions.

## Objectives

- Codec and bitrate strategy (VP8/H.264; consider simulcast/SVC).
- ICE/TURN configuration, keepalive, and aggressive ICE restart policy.
- Dynamic adaptation using getStats() telemetry.

## Media Strategy

- Start with conservative bitrates; ramp based on stats (RTT, packet loss).
- Enable simulcast for camera if using SFU later; for 1:1, prioritize simplicity.
- Prefer hardware-accelerated codecs where available.

## Network Resilience

- STUN/TURN pool with health checks; fallback order documented.
- DSCP/priority hints (where supported) for real-time traffic.
- Handle network change events; trigger renegotiation/ICE restart.

## Telemetry & Adaptation

- Sample getStats() at 1s; compute smoothed loss/RTT/bitrate.
- Adjust send parameters (setParameters) within safe bounds.
- Surface QoS indicators in UI (bars) and logs.

## Acceptance Criteria

- Call setup p95 within SLO; recover from Wi‑Fi→Cell handoff in < 10s p95.
- Packet loss < 5% p95 during steady state on constrained networks.
- Adaptive bitrate visibly improves experience vs fixed.

## Test Plan

- Network shaping (tc/Chrome devtools) for bandwidth/latency/loss.
- Simulate TURN-only path; verify stability and QoS.
- Measure with WebRTC internals and exported stats.
