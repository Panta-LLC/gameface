import React, { useState } from 'react';

import AuthGate from './components/AuthGate';
import RoomGate from './components/RoomGate';
import { ToastProvider } from './components/Toast';
import VideoCall from './components/VideoCall';
// Activity selection moved into the activity column/gallery handled inside VideoCall
// and ActivityHost. Sidebar removed.
import { useActivitySignaling } from './hooks/useActivitySignaling';

export default function App() {
  const [room, setRoom] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const activityApi = useActivitySignaling(room);

  return (
    <ToastProvider>
      <div className="font-sans flex flex-col h-screen bg-gray-200">
        {/* App Bar */}
        {/* <header className="p-4 flex justify-between items-center bg-white border-b border-gray-200 mx-6 mt-2 rounded-xl">
          <h1 className="text-xl">Gameface</h1>
          {name && (
            <span className="text-sm">
              Logged in as: <strong>{name}</strong>
            </span>
          )}
        </header> */}

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
            <div>
              <div>
                {/* <div className="mb-2">
                <strong>Room:</strong> {room} · <strong>User:</strong> {name}{' '}
                <Button variant="destructive" onClick={() => setRoom(null)}>
                  Leave room
                </Button>
              </div> */}
                <VideoCall
                  room={room}
                  initialStream={localStream ?? undefined}
                  localStream={localStream}
                  activity={activityApi.activity}
                  onSelectActivity={activityApi.select}
                />
                {/* <ActivityHost activity={activityApi.activity} /> */}
              </div>
              {/* Activity selection moved into the activity column/gallery; sidebar removed. */}
            </div>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
