# Implementation Prompt – Basic Mini-Games

## Context
Deliver 1–2 simple deterministic games suitable for play during a call: Tic‑Tac‑Toe and Rock‑Paper‑Scissors.

## Requirements
- Pure functions for game logic (deterministic, testable).
- Small UI components; dark-mode friendly; game overlay fits beside video.
- Scoring: best-of N; track wins/losses; reset/rematch flows.

## Tic‑Tac‑Toe
- 3x3 board, X/O turns, win/draw detection.
- Prevent invalid moves; highlight winning line.

## Rock‑Paper‑Scissors
- Simultaneous reveal; prevent early disclosure; handle ties.

## Acceptance Criteria
- Logic passes unit tests (win/draw; illegal move guards).
- UI usable on mobile/desktop; accessible labels.

## Test Plan
- Unit: logic reducers; snapshot tests for UI states.
- Integration: 2-player flow over DataChannel mock.
