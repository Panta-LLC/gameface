import React from 'react';

import type { GameDef } from './types';

type Props = {
  games: GameDef[];
  onSelect: (id: string) => void;
};

export default function CardGameSelector({ games, onSelect }: Props): React.ReactElement {
  return (
    <div className="ct-selector" style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Card games</h3>
      <div
        className="ct-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}
      >
        {games.map((g: GameDef) => (
          <button key={g.id} className="ct-game-card" onClick={() => onSelect(g.id)}>
            <div style={{ fontWeight: 600 }}>{g.name}</div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {g.description || `${g.players} players`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
