import React, { useState, useEffect } from 'react';
import './GameSelection.css';

const games = [
  { id: 1, name: 'Chess', description: 'A classic strategy game.' },
  { id: 2, name: 'Tic-Tac-Toe', description: 'A simple and fun game for two players.' },
  { id: 3, name: 'Trivia', description: 'Test your knowledge with trivia questions.' },
];

const GameSelection: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080'); // Replace with your WebSocket server URL
    setSocket(ws);

    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Message received from server:', data);
        if (data.type === 'GAME_SELECTION') {
          setSelectedGame(data.gameId);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleGameSelect = (gameId: number) => {
    setSelectedGame(gameId);
    console.log(`Game selected: ${gameId}`);
    if (socket) {
      const message = JSON.stringify({ type: 'GAME_SELECTION', gameId });
      console.log('Sending message to server:', message);
      socket.send(message);
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