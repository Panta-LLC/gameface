import React, { useState } from 'react';
import { Button } from './components/ui/button';
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
    <div className="font-sans flex flex-col h-screen">
      {/* App Bar */}
      <header className="p-4 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-xl font-bold">Gameface Web</h1>
        {name && (
          <span className="text-sm">
            Logged in as: <strong>{name}</strong>
          </span>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow overflow-auto p-4">
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
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <div className="mb-2">
                <strong>Room:</strong> {room} · <strong>User:</strong> {name}{' '}
                <Button variant="destructive" onClick={() => setRoom(null)}>
                  Leave room
                </Button>
              </div>
              <VideoCall
                room={room}
                initialStream={localStream ?? undefined}
                localStream={localStream}
              />
              <ActivityHost activity={activityApi.activity} />
            </div>
            <ActivitySidebar
              current={activityApi.activity}
              onPick={(id) => activityApi.select(id)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
