import React from 'react';

import type { GameDef, TableState } from './types';

type Props = {
  tableState: TableState;
  currentPlayerId: string;
  onTakeSeat: (i: number) => void;
  onLeaveSeat: (i: number) => void;
  onStartGame: () => void;
  gameDef: GameDef;
  pendingSeat?: number | null;
};

export default function SeatingBoard({
  tableState,
  currentPlayerId,
  onTakeSeat,
  onLeaveSeat,
  onStartGame,
  gameDef,
  pendingSeat,
}: Props): React.ReactElement {
  const isHost = tableState.hostId === currentPlayerId;

  return (
    <div className="ct-seating" style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>{gameDef.name} — Seating</h3>
      {/* Game rules / quick reference */}
      <details style={{ marginBottom: 8 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13 }}>Show game rules</summary>
        {gameDef.adapter && gameDef.adapter.rulesComponent ? (
          // render the provided rules component from the adapter and pass players count
          React.createElement(gameDef.adapter.rulesComponent, { players: gameDef.players })
        ) : (
          <div style={{ marginTop: 8, color: '#666' }}>No rules available for this game.</div>
        )}
      </details>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {tableState.seats.map((s) => {
          const occupied = !!s.playerId;
          const isMe = s.playerId === currentPlayerId;
          return (
            <div key={s.index} className={`ct-seat ${occupied ? 'occupied' : 'empty'}`}>
              <button
                disabled={occupied && !isMe}
                onClick={() => (isMe ? onLeaveSeat(s.index) : onTakeSeat(s.index))}
                aria-label={
                  occupied
                    ? `Seat ${s.index + 1} occupied by ${s.playerId}`
                    : `Take seat ${s.index + 1}`
                }
              >
                <div style={{ minWidth: 140, minHeight: 70, padding: 8 }}>
                  <div style={{ fontWeight: 600 }}>
                    {occupied ? s.displayName || s.playerId : `Seat ${s.index + 1}`}
                  </div>
                  {pendingSeat === s.index && (
                    <div style={{ fontSize: 12, color: '#666' }}>Pending...</div>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        {/* Show start when seats are full or host chooses to start */}
        {tableState.seats.every((s) => s.playerId !== null) ? (
          <button className="ct-start-btn" onClick={onStartGame}>
            Start game
          </button>
        ) : (
          <div style={{ color: '#666', fontSize: 13 }}>
            Waiting for players ({tableState.seats.filter((s) => s.playerId).length}/
            {tableState.seats.length})
          </div>
        )}
      </div>
    </div>
  );
}
