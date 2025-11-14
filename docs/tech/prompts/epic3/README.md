# Epic 3 – Mini-Game Integration

Integrate simple mini-games users can play during video calls. Focus on low-latency sync, intuitive UX, and clean separation between game engine logic and signaling.

Scope (MVP):
- Game selection UI.
- Real-time game state sync between two peers.
- 1–2 simple games (e.g., Tic‑Tac‑Toe, Rock‑Paper‑Scissors) with scoring.

---
## Architecture Overview
- Frontend: game UI components + deterministic game engine.
- Signaling: reuse WebSocket channel (separate namespace) or WebRTC DataChannel for low-latency updates.
- Persistence (optional MVP): best-of series scoreboard in memory; later durable store.

---
## Observability
- Logs: `game.select`, `game.start`, `game.move`, `game.finish`.
- Metrics: `game_latency_ms`, `moves_total`, `games_started_total`, `games_finished_total`.
- Traces: spans per game lifecycle stage.

---
## Acceptance Criteria (Aggregate)
- Players can choose a game and start within 2 clicks.
- Game state stays consistent under packet loss (idempotent/sequence-guarded updates).
- Games finish with correct scoring; rematch flow available.

---
## Prompts
- game-selection-implementation-prompt.md
- game-sync-implementation-prompt.md
- basic-games-implementation-prompt.md
