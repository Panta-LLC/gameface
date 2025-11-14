# Epic 6 – Performance Optimization

Reduce latency and improve reliability through targeted load testing, caching, and WebRTC tuning.

Scope (MVP):

- Load testing with realistic scenarios and SLOs.
- Strategic caching to cut hot-path latency and load.
- WebRTC performance tuning for low-latency media.

---

## Architecture Overview

- Test harness: synthetic users, scripted journeys.
- Caching layers: HTTP/CDN (where applicable), Redis for API hot paths.
- WebRTC: codec/bitrate/profile selection; ICE/TURN configuration.

---

## Observability

- Metrics: p50/p95/p99 latency, error rate, cache hit ratio, bandwidth usage.
- Logs: `perf.test.start/end`, `cache.hit/miss`, `webrtc.stats.sample`.
- Traces: end-to-end spans for critical user journeys.

---

## Acceptance Criteria (Aggregate)

- API p95 latency under agreed threshold (e.g., < 150ms) for key endpoints.
- Cache hit ratio ≥ 80% for configured hot paths.
- Call setup time p95 improves and remains within SLO (e.g., < 3s).

---

## Prompts

- load-testing-implementation-prompt.md
- caching-implementation-prompt.md
- webrtc-performance-tuning-implementation-prompt.md
