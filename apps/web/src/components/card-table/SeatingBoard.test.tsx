import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect,it } from 'vitest';

import SpadesRules from './rules/spadesRules';
import SeatingBoard from './SeatingBoard';
import type { TableState } from './types';

describe('SeatingBoard rules', () => {
  it('renders the adapter-provided rules component when present', () => {
    const tableState: TableState = {
      gameId: 'spades',
      status: 'lobby',
      seats: Array.from({ length: 4 }, (_, i) => ({ index: i, playerId: null })),
      hostId: 'host',
    };

    const gameDef: any = {
      id: 'spades',
      name: 'Spades',
      players: 4,
      adapter: {
        id: 'spades',
        players: 4,
        rulesComponent: SpadesRules,
      },
    };

    render(
      <SeatingBoard
        tableState={tableState}
        currentPlayerId="guest"
        onTakeSeat={() => {}}
        onLeaveSeat={() => {}}
        onStartGame={() => {}}
        gameDef={gameDef}
      />,
    );

    // The SpadesRules component includes the header text "Spades — Quick rules"
    expect(screen.getByText(/Spades — Quick rules/i)).toBeInTheDocument();
  });
});
