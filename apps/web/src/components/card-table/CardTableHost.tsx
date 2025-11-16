import React, { useMemo } from 'react';
import type { GameDef } from './types';
import { spadesAdapter } from './adapters/spadesAdapter';
import CardGameSelector from './CardGameSelector';
import SeatingBoard from './SeatingBoard';
import GameBoardWrapper from './GameBoardWrapper';
import { useCardTable } from './hooks/useCardTable';
import './CardTable.css';

const GAMES: GameDef[] = [
  {
    id: 'spades',
    name: 'Spades',
    players: 4,
    description: 'Classic trick-taking',
    adapter: spadesAdapter,
  },
  { id: 'hearts', name: 'Hearts', players: 4, description: 'Classic avoidance game' },
  { id: 'bridge', name: 'Bridge', players: 4, description: 'Bridge (placeholder)' },
  { id: 'custom', name: 'Custom', players: 2, description: 'Custom game' },
];

type Props = {
  currentPlayerId?: string;
  signalingClient?: any;
  initialGameId?: string | null;
  onClose?: () => void;
};

export default function CardTableHost({
  currentPlayerId,
  signalingClient,
  initialGameId,
  onClose,
}: Props) {
  const me = currentPlayerId ?? 'guest';
  const initialGame = useMemo(
    () => GAMES.find((g) => g.id === initialGameId) ?? null,
    [initialGameId],
  );
  const { tableState, pendingSeatClaim, takeSeat, leaveSeat, attemptStart, selectGame, send } =
    useCardTable({ signaling: signalingClient, initialGame, currentPlayerId: me });

  const selectedAdapter = tableState
    ? GAMES.find((g) => g.id === tableState.gameId)?.adapter
    : null;

  if (!tableState) {
    return (
      <div className="ct-host">
        <CardGameSelector
          games={GAMES}
          onSelect={(id) => selectGame(GAMES.find((g) => g.id === id) ?? null)}
        />
        <div style={{ padding: 12 }}>
          <button onClick={() => onClose?.()}>Close</button>
        </div>
      </div>
    );
  }

  if (tableState.status === 'lobby') {
    return (
      <div className="ct-host">
        <SeatingBoard
          tableState={tableState}
          currentPlayerId={me}
          onTakeSeat={takeSeat}
          onLeaveSeat={leaveSeat}
          onStartGame={() => attemptStart(selectedAdapter ?? undefined)}
          gameDef={GAMES.find((g) => g.id === tableState.gameId)!}
          pendingSeat={pendingSeatClaim}
        />
      </div>
    );
  }

  return (
    <GameBoardWrapper
      adapter={selectedAdapter ?? undefined}
      tableState={tableState}
      playerId={me}
      signaling={{ send }}
    />
  );
}
