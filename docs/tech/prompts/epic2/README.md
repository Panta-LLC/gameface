# Epic 2 – Real-Time Video Communication

This folder contains implementation prompts for Epic 2: WebRTC-based 1:1 real-time video with rich controls and resilient connections.

Scope (MVP):

- Peer-to-peer video streaming with WebRTC.
- Audio and video controls (mute, camera toggle, device switch).
- Connection stability (reconnect, ICE restarts, error handling).
- Lightweight signaling service for SDP/candidates.

---

## High-Level Architecture

```
Frontend (Web/App)
  ├─ Media Capture (getUserMedia / getDisplayMedia)
  ├─ WebRTC PeerConnection (tracks, ICE, codecs)
  ├─ Controls: Mute/Unmute, Camera Toggle, Device Switch
  └─ QoS: Stats, Bitrate Adaptation (simulcast/SVC optional)

Identity Service (Auth gate)

Signaling Service (WebSocket)
  ├─ Rooms / Peers registry
  ├─ Offer/Answer exchange
  └─ ICE candidates relay

STUN/TURN (coturn / managed)
```

---

## Security & Privacy

- Auth required to join a call room (bearer token). Room membership authorized by backend policy.
- Do not send raw media through signaling; only metadata (SDP/candidates).
- Limit PII in logs; hash user identifiers.

---

## Observability

- Structured logs: signaling.join, signaling.offer, peer.connected, ice.state, reconnect.attempt/success/failure.
- Metrics: call_setup_time_ms, reconnect_attempts_total, active_calls_gauge, signaling_messages_total.
- Traces: spans for signaling handshake and ICE establishment.

---

## Acceptance Criteria (Aggregate)

- A 1:1 call connects in < 3s p95 on healthy networks.
- Mute/unmute and camera toggle reflect instantly in remote view (< 300ms).
- Device switch works during active call without dropping connection.
- Network loss triggers automatic reconnection and recovers within 10s p95.
- No sensitive data in logs; signaling messages validated; rate limits enforced.

---

## Prompts

- p2p-video-implementation-prompt.md
- audio-video-controls-implementation-prompt.md
- connection-stability-implementation-prompt.md
- signaling-implementation-prompt.md
