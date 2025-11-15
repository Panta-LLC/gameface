import React, { useState } from 'react';

type Props = {
  current: string | null;
  onPick: (id: string) => void;
};

const CATALOG = [
  { id: 'card-table', name: 'Card Table' },
  { id: 'trivia', name: 'Trivia' },
  { id: 'whiteboard', name: 'Whiteboard' },
];

export default function ActivitySidebar({ current, onPick }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <aside
      style={{
        width: open ? 220 : 44,
        transition: 'width 160ms ease',
        borderLeft: '1px solid #ddd',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      aria-label="Activity sidebar"
    >
      <button aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? '⟨' : '⟩'}
      </button>
      {open && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
          {CATALOG.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => onPick(a.id)}
                aria-current={current === a.id}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: 8,
                  borderRadius: 8,
                  background: current === a.id ? '#eaf2ff' : '#fff',
                  border: '1px solid #ccc',
                }}
              >
                {a.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
