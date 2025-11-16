import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useCardTable } from './useCardTable';
import type { GameDef } from '../types';

// Simple harness to expose hook actions via DOM for testing
function Harness({ id, playerId }: { id: string; playerId: string }) {
  const gameDef: GameDef = { id: 'g1', name: 'Game 1', players: 2 };
  const { tableState, pendingSeatClaim, takeSeat, selectGame, attemptStart } = useCardTable({
    signaling: null,
    initialGame: null,
    currentPlayerId: playerId,
  });

  return (
    <div data-testid={`harness-${id}`}>
      <div data-testid={`state-${id}`}>{JSON.stringify(tableState)}</div>
      <div data-testid={`pending-${id}`}>{pendingSeatClaim ?? ''}</div>
      <button onClick={() => selectGame(gameDef)} data-testid={`select-${id}`}>
        select
      </button>
      <button onClick={() => takeSeat(0)} data-testid={`take-${id}`}>
        take0
      </button>
      <button onClick={() => takeSeat(1)} data-testid={`take1-${id}`}>
        take1
      </button>
      <button
        onClick={() => {
          const res = attemptStart();
          // render result as attribute (not ideal, but simple)
          const el = document.getElementById(`start-res-${id}`);
          if (el) el.textContent = JSON.stringify(res);
        }}
        data-testid={`start-${id}`}
      >
        start
      </button>
      <div id={`start-res-${id}`} />
    </div>
  );
}

describe('useCardTable (local bus)', () => {
  it('propagates selectGame to other instances', async () => {
    render(
      <>
        <Harness id="A" playerId="p1" />
        <Harness id="B" playerId="p2" />
      </>,
    );

    const selectA = screen.getByTestId('select-A');
    fireEvent.click(selectA);

    await waitFor(() => {
      const stateB = screen.getByTestId('state-B');
      expect(stateB.textContent).toContain('g1');
    });
  });

  it('seat claims sync across instances (local mode)', async () => {
    render(
      <>
        <Harness id="A" playerId="p1" />
        <Harness id="B" playerId="p2" />
      </>,
    );

    fireEvent.click(screen.getByTestId('select-A'));

    await waitFor(() => expect(screen.getByTestId('state-B').textContent).toContain('g1'));

    fireEvent.click(screen.getByTestId('take-A'));

    await waitFor(() => {
      const stateB = JSON.parse(screen.getByTestId('state-B').textContent || 'null');
      expect(stateB).toBeTruthy();
      expect(stateB.seats[0].playerId).toBe('p1');
    });
  });

  it('allows starting when seats are full', async () => {
    render(
      <>
        <Harness id="A" playerId="p1" />
        <Harness id="B" playerId="p2" />
      </>,
    );

    fireEvent.click(screen.getByTestId('select-A'));
    await waitFor(() => expect(screen.getByTestId('state-B').textContent).toContain('g1'));

    // both take seats
    fireEvent.click(screen.getByTestId('take-A'));
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('state-B').textContent || '{}').seats[0].playerId).toBe(
        'p1',
      ),
    );

    // second takes seat 1 via harness B
    fireEvent.click(screen.getByTestId('take1-B'));

    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('state-B').textContent || '{}').seats[1].playerId).toBe(
        'p2',
      ),
    );

    // Now attempt to start from A
    fireEvent.click(screen.getByTestId('start-A'));

    await waitFor(() => {
      const resText = document.getElementById('start-res-A')?.textContent || '';
      expect(resText).toContain('ok');
      const stateA = JSON.parse(screen.getByTestId('state-A').textContent || '{}');
      expect(stateA.status).toBe('started');
    });
  });
});
