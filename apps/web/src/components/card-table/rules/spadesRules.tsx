import React from 'react';

export default function SpadesRules() {
  return (
    <div style={{ marginTop: 12, fontSize: 13, color: '#333' }}>
      <h4 style={{ margin: '6px 0' }}>Spades — Quick rules</h4>
      <ul style={{ margin: '6px 0 0 18px' }}>
        <li>4 players in fixed teams of 2 (partners sit opposite each other).</li>
        <li>Standard 52-card deck — each player gets 13 cards.</li>
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
          Scoring and nil/penalty rules vary by variant — this implementation requires all 4 seats
          filled before starting.
        </li>
      </ul>
      <div style={{ marginTop: 8, color: '#666' }}>
        This screen only manages seating and starting the game. The full play rules will be enforced
        in the game board.
      </div>
    </div>
  );
}
