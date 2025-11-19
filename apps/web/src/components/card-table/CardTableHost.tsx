import './CardTable.css';

import React, { useMemo, useState } from 'react';

import { spadesAdapter } from './adapters/spadesAdapter';
import CardGameSelector from './CardGameSelector';
import GameBoardWrapper from './GameBoardWrapper';
import { useCardTable } from './hooks/useCardTable';
import SeatingBoard from './SeatingBoard';
import type { GameDef, SignalingClientLike } from './types';

const GAMES: GameDef[] = [
  {
    id: 'spades',
    name: 'Spades',
    players: 4,
    playersOptions: [2, 4],
    description: 'Classic trick-taking',
    adapter: spadesAdapter,
  },
  { id: 'hearts', name: 'Hearts', players: 4, description: 'Classic avoidance game' },
  { id: 'bridge', name: 'Bridge', players: 4, description: 'Bridge (placeholder)' },
  { id: 'custom', name: 'Custom', players: 2, description: 'Custom game' },
];

type Props = {
  currentPlayerId?: string;
  signalingClient?: SignalingClientLike | null;
  initialGameId?: string | null;
  onClose?: () => void;
};

export default function CardTableHost({
  currentPlayerId,
  signalingClient,
  initialGameId,
  onClose,
}: Props): React.ReactElement {
  const me = currentPlayerId ?? 'guest';
  const initialGame = useMemo(
    () => GAMES.find((g) => g.id === initialGameId) ?? null,
    [initialGameId],
  );
  const [pendingVariantGame, setPendingVariantGame] = useState<GameDef | null>(null);
  const {
    tableState,
    pendingSeatClaim,
    takeSeat,
    leaveSeat,
    attemptStart,
    selectGame,
    _send,
    signalingClient: client,
  } = useCardTable({ signaling: signalingClient, initialGame, currentPlayerId: me });

  const selectedAdapter = tableState
    ? GAMES.find((g) => g.id === tableState.gameId)?.adapter
    : null;

  if (!tableState) {
    return (
      <div className="ct-host">
        <CardGameSelector
          games={GAMES}
          onSelect={(id) => {
            const g = GAMES.find((gg) => gg.id === id) ?? null;
            if (g && g.playersOptions && g.playersOptions.length > 1) {
              // ask the user to pick variant before creating table
              setPendingVariantGame(g);
            } else {
              selectGame(g);
            }
          }}
        />
        {pendingVariantGame && (
          <div style={{ padding: 12 }}>
            <h4 style={{ marginTop: 0 }}>Choose players</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              {pendingVariantGame.playersOptions!.map((opt: number) => (
                <button
                  key={opt}
                  onClick={() => {
                    // pass a GameDef with the selected players count
                    selectGame({ ...pendingVariantGame, players: opt });
                    setPendingVariantGame(null);
                  }}
                >
                  {opt} players
                </button>
              ))}
              <button onClick={() => setPendingVariantGame(null)}>Cancel</button>
            </div>
          </div>
        )}
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
      signaling={client}
    />
  );
}
