import React, { useEffect } from 'react';
import GameSelection from './components/GameSelection';
import SignalingClient from './webrtc/SignalingClient';

export default function App() {
  useEffect(() => {
    const signalingClient = new SignalingClient('ws://localhost:3001');

    signalingClient.onMessage((message) => {
      console.log('Received signaling message:', message);
    });

    return () => {
      signalingClient.close();
    };
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }} className="App">
      <h1>Gameface Web</h1>
      <p>Welcome to the Gameface frontend.</p>
      <GameSelection />
    </div>
  );
}
