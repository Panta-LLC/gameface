# Implementation Prompt – Game Selection UI

## Context
Provide a lightweight game picker that users can access during an active call without disrupting media streams.

## Objectives
- Non-intrusive overlay UI with keyboard and screen-reader accessibility.
- Room-scoped game selection (host proposes, peer accepts).
- Minimal state persisted client-side for last-played game.

## Requirements
- Simple list/grid of available games with preview.
- Confirm dialog and countdown before start.
- Cancel and rematch flows.

## Logging & Metrics
- `game.select.attempt/success/cancel`, `game.rematch`.
- `game_selection_latency_ms` from open to start.

## Acceptance Criteria
- Host can propose a game; peer accepts; game starts with clear feedback.
- Cancels/declines are handled gracefully.

## Test Plan
- Unit: state machine for proposals/accepts.
- E2E: propose -> accept -> start -> cancel -> rematch.
