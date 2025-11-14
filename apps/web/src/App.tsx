import React from 'react';
import GameSelection from './components/GameSelection';

export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }} className="App">
      <h1>Gameface Web</h1>
      <p>Welcome to the Gameface frontend.</p>
      <GameSelection />
    </div>
  );
}
