import React, { useState } from 'react';
import VideoCall from './components/VideoCall';
import RoomGate from './components/RoomGate';
import AuthGate from './components/AuthGate';
import ActivitySidebar from './components/ActivitySidebar';
import ActivityHost from './components/ActivityHost';
import { useActivitySignaling } from './hooks/useActivitySignaling';

export default function App() {
  const [room, setRoom] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const activityApi = useActivitySignaling(room);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }} className="App">
      <h1>Gameface Web</h1>
      {!name || !localStream ? (
        <AuthGate
          onGranted={({ name, stream }) => {
            setName(name);
            setLocalStream(stream);
          }}
        />
      ) : !room ? (
        <RoomGate onJoin={(r: string) => setRoom(r)} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
          <div>
            <div style={{ marginBottom: 8 }}>
              <strong>Room:</strong> {room} · <strong>User:</strong> {name}{' '}
              <button onClick={() => setRoom(null)}>Leave room</button>
            </div>
            <VideoCall room={room} initialStream={localStream ?? undefined} />
            <ActivityHost activity={activityApi.activity} />
          </div>
          <ActivitySidebar current={activityApi.activity} onPick={(id) => activityApi.select(id)} />
        </div>
      )}
    </div>
  );
}
