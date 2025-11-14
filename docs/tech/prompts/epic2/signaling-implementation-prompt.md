# Implementation Prompt – Signaling Service (WebSocket)

## Context

Provide a lightweight, scalable signaling layer to exchange SDP offers/answers and ICE candidates between peers. The service coordinates room membership and relays messages; it does not handle media.

## Objectives

- Reliable message delivery for small rooms (1:1 to start).
- Authenticated connections; room authorization and rate limiting.
- Horizontal scalability with shared state (Redis pub/sub) if needed.

## Protocol

Transport: WebSocket (wss).
Auth: Bearer token on connection query/header; validate before joining room.
Rooms: `roomId` path or message. Peers identified by `peerId` (UUID).

### Message Types

```
client->server
{ type: "join", roomId, peerId }
{ type: "leave", roomId, peerId }
{ type: "offer", roomId, from, to, sdp }
{ type: "answer", roomId, from, to, sdp }
{ type: "candidate", roomId, from, to, candidate }

server->client
{ type: "joined", roomId, peers:[peerId] }
{ type: "peer_joined", roomId, peerId }
{ type: "peer_left", roomId, peerId }
{ type: "relay", inner: { offer|answer|candidate }, correlationId }
{ type: "error", code, message }
```

Rules:

- Validate message schema; reject oversize payloads.
- Idempotency for duplicate join/leave.
- Targeted relay (from->to) for 1:1; broadcast only membership events.

## Security

- Validate JWT and authorization to room (backend policy lookup).
- Rate limit per connection and per room (token bucket).
- Throttle burst `candidate` floods; drop over limit with warning.
- No PII in logs; hash user IDs.

## Observability

- Logs: `ws.connect`, `ws.auth_success`, `room.join`, `room.leave`, `relay.offer`, `relay.answer`, `relay.candidate`.
- Metrics: `ws_connections_gauge`, `room_members_gauge`, `messages_total{type}`, `relay_latency_ms`.
- Traces: spans for connection lifecycle and relays.

## Scaling

- Single instance for MVP.
- For HA: sticky sessions + Redis pub/sub for cross-node room events.
- Heartbeats and stale connection cleanup (ping/pong with timeouts).

## Acceptance Criteria

- Two peers can reliably exchange offer/answer/candidates and connect.
- Unauthorized access denied with clear error.
- Rate limiting prevents message floods without breaking valid calls.
- Logs/metrics/traces available.

## Test Plan

- Unit: message schema validation and authorization guard.
- Integration: connect two clients, exchange offer/answer/candidates, form P2P connection.
- Load: burst candidates to ensure throttling works.
- Security: invalid tokens rejected; room authorization enforced.

## Implementation Steps

1. WebSocket server with auth handshake and room management.
2. Message schema validation (e.g., zod/ajv) with size limits.
3. Relay logic with correlation IDs; per-room registries.
4. Rate limiting and flood protection.
5. Observability and graceful shutdown.
6. Tests (unit/integration) and local run scripts.
