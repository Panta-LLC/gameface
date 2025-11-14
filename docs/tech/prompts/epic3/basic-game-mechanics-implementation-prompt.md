# Basic Game Mechanics Implementation Prompt

## Objective

Develop the core mechanics for mini-games, ensuring they are reusable, scalable, and support scoring and user interactions.

## Requirements

### Core Mechanics

- Implement generic game rules that can be extended for specific games.
- Include a scoring system that tracks player progress.
- Design user interactions for:
  - Starting a game.
  - Making moves.
  - Ending a game.

### Reusability

- Ensure the mechanics are modular and can be reused for multiple games.
- Provide clear interfaces for game-specific logic.

### Observability

- Add logs for key events:
  - `game.start`
  - `game.move`
  - `game.finish`
- Track metrics such as:
  - `game_latency_ms`
  - `game_moves_total`
  - `games_started_total`
  - `games_finished_total`

## Acceptance Criteria

- Players can start and finish a game seamlessly.
- Scoring updates correctly based on game rules.
- Core mechanics are reusable for other mini-games.

## References

- [Epic 3 – Mini-Game Integration](../README.md)
