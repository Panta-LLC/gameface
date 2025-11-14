# Spades Game Implementation Prompt

## Objective

Develop the Spades card game for both 2 and 4 players. Ensure the core mechanics are general enough to support multiple card games.

## Requirements

### Core Mechanics

- Implement the rules of Spades, including:
  - Trick-taking gameplay.
  - Bidding phase.
  - Scoring system.
- Ensure the game supports both 2-player and 4-player modes.
- Design the mechanics to be reusable for other card games.

### User Interface

- Create a responsive and intuitive UI for:
  - Displaying the game board.
  - Showing player hands and scores.
  - Allowing players to bid and play cards.

### Real-Time Synchronization

- Use WebSocket or WebRTC DataChannel for low-latency updates.
- Ensure game state consistency under packet loss.

### Observability

- Add logs for key events:
  - `spades.start`
  - `spades.bid`
  - `spades.play`
  - `spades.finish`
- Track metrics such as:
  - `spades_latency_ms`
  - `spades_moves_total`
  - `spades_games_started_total`
  - `spades_games_finished_total`

## Acceptance Criteria

- Players can start a Spades game within 2 clicks.
- Game state remains consistent under packet loss.
- Scoring and bidding follow Spades rules.
- Core mechanics are reusable for other card games.

## References

- [Spades Rules](https://www.pagat.com/whist/spades.html)
- [Epic 3 – Mini-Game Integration](../README.md)
