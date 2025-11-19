import { useCallback, useEffect, useRef, useState } from 'react';

import SignalingClient from '../webrtc/SignalingClient';

export function useActivitySignaling(room: string | null) {
  const clientRef = useRef<SignalingClient | null>(null);
  const [activity, setActivity] = useState<string | null>(null);

  useEffect(() => {
    // Tear down any previous client first
    if (clientRef.current) {
      try {
        clientRef.current.close();
      } catch {}
      clientRef.current = null;
    }

    // If no room, reset activity and do nothing
    if (!room) {
      setActivity(null);
      return;
    }

    const client = new SignalingClient('ws://localhost:3001');
    clientRef.current = client;
    client.onOpen(() => {
      client.sendMessage({ type: 'join', room });
    });
    client.onMessage((msg) => {
      if (msg.type === 'activity-selected') {
        setActivity(msg.activity || null);
      }
    });
    return () => client.close();
  }, [room]);

  const select = useCallback((next: string | null) => {
    setActivity(next);
    // Allow clearing the activity by sending a null activity to the server.
    clientRef.current?.sendMessage({ type: 'select-activity', activity: next });
  }, []);

  return { activity, select } as const;
}
