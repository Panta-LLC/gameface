import React, { useState } from 'react';

type Props = {
  onJoin: (room: string) => void;
};

export default function RoomGate({ onJoin }: Props) {
  const [room, setRoom] = useState('room1');

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <label>
        Room:
        <input value={room} onChange={(e) => setRoom(e.target.value)} style={{ marginLeft: 8 }} />
      </label>
      <button onClick={() => onJoin(room)} disabled={!room.trim()}>
        Join Room
      </button>
    </div>
  );
}
