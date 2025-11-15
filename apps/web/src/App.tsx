import React, { useState } from 'react';
import GameSelection from './components/GameSelection';
import VideoCall from './components/VideoCall';
import RoomGate from './components/RoomGate';

export default function App() {
  const [room, setRoom] = useState<string | null>(null);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }} className="App">
      <h1>Gameface Web</h1>
      {!room ? (
        <RoomGate onJoin={(r: string) => setRoom(r)} />
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <strong>Room:</strong> {room} <button onClick={() => setRoom(null)}>Leave room</button>
          </div>
          <GameSelection room={room} />
          <VideoCall room={room} />
        </>
      )}
    </div>
  );
}
