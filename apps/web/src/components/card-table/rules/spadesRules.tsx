import React from 'react';

type Props = { players?: number };

export default function SpadesRules({ players = 4 }: Props) {
  if (players === 2) {
    return (
      <div style={{ marginTop: 12, fontSize: 13, color: '#333' }}>
        <h4 style={{ margin: '6px 0' }}>Spades — 2‑Player Quick Rules</h4>
        <p style={{ marginTop: 6 }}>
          In two‑player Spades each player builds a 13‑card hand. A standard 52‑card deck is used
          (no jokers); the remaining 26 cards are set aside and not used.
        </p>
        <h5 style={{ margin: '8px 0 4px' }}>Setup</h5>
        <ul style={{ margin: '0 0 6px 18px' }}>
          <li>The deck is shuffled and placed face‑down in the center.</li>
          <li>
            Players alternate drawing to build 13‑card hands. For each pair of top two cards the
            drawing player may either keep the first and discard the second, or discard the first
            and keep the second. Repeat until each player has 13 cards.
          </li>
          <li>The non‑dealer leads the first trick.</li>
        </ul>

        <h5 style={{ margin: '8px 0 4px' }}>Gameplay</h5>
        <ul style={{ margin: '0 0 6px 18px' }}>
          <li>
            Bidding: each player bids how many tricks they expect to win. A nil bid (zero tricks) is
            allowed.
          </li>
          <li>
            Following suit: players must follow the suit led if possible; otherwise they may play
            any card (including a spade to break spades).
          </li>
          <li>
            Breaking spades: spades are trump. They cannot be led until spades have been played to a
            trick (broken), except when a player has only spades in hand.
          </li>
          <li>
            Winning a trick: highest card of the suit led wins unless one or more spades were played
            — then the highest spade wins. The trick winner leads the next trick.
          </li>
          <li>The round ends after 13 tricks (each player has played all cards).</li>
        </ul>

        <div style={{ marginTop: 8, color: '#666' }}>
          This screen only manages seating and starting the game. The full play rules and scoring
          will be enforced in the game board implementation.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, fontSize: 13, color: '#333' }}>
      <h4 style={{ margin: '6px 0' }}>Spades — Quick rules</h4>
      <ul style={{ margin: '6px 0 0 18px' }}>
        <li>4 players in fixed teams of 2 (partners sit opposite each other).</li>
        <li>Standard 52‑card deck — each player gets 13 cards.</li>
        <li>
          Spades are always trump and cannot be led until broken (someone has played a spade on a
          prior trick).
        </li>
        <li>
          Before play, each player bids how many tricks they expect to take. Bids sum to the
          contract for the hand.
        </li>
        <li>
          Tricks are played clockwise; highest card of the led suit wins unless trumped by a spade.
        </li>
        <li>
          Scoring and nil/penalty rules vary by variant — this implementation requires all seats
          filled to start.
        </li>
      </ul>
      <div style={{ marginTop: 8, color: '#666' }}>
        This screen only manages seating and starting the game. The full play rules will be enforced
        in the game board.
      </div>
    </div>
  );
}
