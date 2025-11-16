import React from 'react';
import type { GameAdapter } from '../types';
import SpadesRules from '../rules/spadesRules';

export const spadesAdapter: GameAdapter = {
  id: 'spades',
  players: 4,
  initialState: () => ({ deckSeed: Date.now(), hands: {} }),
  validateStart: (state) => {
    const filled = state.seats.every((s) => s.playerId !== null);
    return {
      ok: filled,
      reason: filled ? undefined : 'All 4 seats must be filled to start Spades',
    };
  },
  GameBoard: function SpadesBoard({ tableState }: any) {
    return (
      <div style={{ padding: 12 }}>
        <h4>Spades — placeholder board</h4>
        <div>Game id: {tableState.gameId}</div>
        <div>Seats: {tableState.seats.map((s: any) => s.playerId || '—').join(', ')}</div>
      </div>
    );
  },
  // Provide the rules UI directly from the adapter
  rulesComponent: SpadesRules,
};

export default spadesAdapter;
