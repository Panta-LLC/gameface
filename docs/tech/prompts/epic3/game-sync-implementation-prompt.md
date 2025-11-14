# Implementation Prompt – Real-Time Game State Sync

## Context

Keep both players' game state consistent with low latency and resilience to packet loss/out-of-order delivery.

## Transport Options

- WebRTC DataChannel (preferred for sub-100ms latency).
- Signaling WebSocket as fallback.

## Protocol

- Sequence-numbered messages with dedupe.
- Soft authoritative host; conflict resolution rules.
- Snapshot + delta updates; periodic full-state checksum.

## Security

- Room auth via bearer token; per-room rate limits.
- Validate message schema; max size limits.

## Logging & Metrics

- `game.msg.send`, `game.msg.recv`, `game.desync.detected`, `game.resync`.
- `game_rtt_ms`, `game_resync_count_total`.

## Acceptance Criteria

- No divergent states after 100 randomized moves under 2% packet loss.
- Resync occurs automatically when checksum differs.

## Test Plan

- Property-based tests for state transitions.
- Network simulation (loss, reordering) with integration tests.
