import React from 'react';

import type { GameAdapter, SignalingClientLike, TableState } from './types';

type Props = {
  adapter?: GameAdapter;
  tableState: TableState;
  playerId: string;
  signaling: SignalingClientLike | null;
};

export default function GameBoardWrapper({
  adapter,
  tableState,
  playerId,
  signaling,
}: Props): React.ReactElement {
  if (!adapter) return <div style={{ padding: 12 }}>No adapter provided for this game.</div>;
  const Board = adapter.GameBoard;
  if (Board) return <Board tableState={tableState} playerId={playerId} signaling={signaling} />;
  return (
    <div style={{ padding: 12 }}>
      <h4>{adapter.id} — Game board</h4>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(tableState, null, 2)}</pre>
    </div>
  );
}
