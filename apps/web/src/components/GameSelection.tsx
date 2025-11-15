import React, { useState, useEffect } from 'react';
import './GameSelection.css';
import SignalingClient from '../webrtc/SignalingClient';

const games = [
  { id: 1, name: 'Chess', description: 'A classic strategy game.' },
  { id: 2, name: 'Tic-Tac-Toe', description: 'A simple and fun game for two players.' },
  { id: 3, name: 'Trivia', description: 'Test your knowledge with trivia questions.' },
];

const GameSelection: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [signalingClient, setSignalingClient] = useState<SignalingClient | null>(null);

  useEffect(() => {
    console.log('Initializing WebSocket connection to signaling server...');
    const client = new SignalingClient('ws://localhost:3001'); // Updated to use the signaling server
    setSignalingClient(client);

    client.onMessage((message) => {
      console.log('Message received from server:', message);
      if (message.type === 'GAME_SELECTION') {
        console.log('Processing GAME_SELECTION event:', message);
        setSelectedGame(message.gameId);
        console.log('Updated selected game to:', message.gameId);
      } else {
        console.log('Unhandled message type:', message.type);
      }
    });

    client.onDisconnect(() => {
      console.log('WebSocket connection disconnected.');
    });

    return () => {
      console.log('Closing WebSocket connection...');
      client.close();
    };
  }, []);

  const handleGameSelect = (gameId: number) => {
    setSelectedGame(gameId);
    console.log(`Game selected: ${gameId}`);
    if (signalingClient) {
      const message = { type: 'GAME_SELECTION', gameId };
      console.log('Sending message to server:', message);
      signalingClient.sendMessage(message);
    }
  };

  return (
    <div className="game-selection">
      <h2>Select a Game</h2>
      <ul>
        {games.map((game) => (
          <li
            key={game.id}
            className={selectedGame === game.id ? 'selected' : ''}
            onClick={() => handleGameSelect(game.id)}
          >
            <h3>{game.name}</h3>
            <p>{game.description}</p>
          </li>
        ))}
      </ul>
      {selectedGame && (
        <div className="game-details">
          <h3>Selected Game:</h3>
          <p>{games.find((game) => game.id === selectedGame)?.name}</p>
        </div>
      )}
    </div>
  );
};

export default GameSelection;
