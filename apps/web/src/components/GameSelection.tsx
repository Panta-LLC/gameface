import React, { useState, useEffect } from 'react';
import './GameSelection.css';
import SignalingClient from '../webrtc/SignalingClient';

const games = [
  { id: 1, name: 'Chess', description: 'A classic strategy game.' },
  { id: 2, name: 'Tic-Tac-Toe', description: 'A simple and fun game for two players.' },
  { id: 3, name: 'Trivia', description: 'Test your knowledge with trivia questions.' },
];

type Props = { room: string };

const GameSelection: React.FC<Props> = ({ room }) => {
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [signalingClient, setSignalingClient] = useState<SignalingClient | null>(null);
  const [allReady, setAllReady] = useState(false);
  const [iAmReady, setIAmReady] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    console.log('Initializing WebSocket connection to signaling server...');
    const client = new SignalingClient('ws://localhost:3001'); // signaling server
    setSignalingClient(client);

    client.onOpen(() => {
      client.sendMessage({ type: 'join', room });
    });

    client.onMessage((message) => {
      console.log('Message received from server:', message);
      switch (message.type) {
        case 'game-selected':
          setSelectedGame(Number(message.game));
          setAllReady(false);
          setIAmReady(false);
          setStarted(false);
          break;
        case 'all-ready':
          setAllReady(true);
          break;
        case 'start-game':
          setStarted(true);
          break;
        default:
          break;
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
      const message = { type: 'select-game', game: String(gameId) };
      console.log('Sending message to server:', message);
      signalingClient.sendMessage(message);
    }
  };

  const sendReady = () => {
    if (!signalingClient) return;
    signalingClient.sendMessage({ type: 'ready' });
    setIAmReady(true);
  };

  const startGame = () => {
    if (!signalingClient) return;
    signalingClient.sendMessage({ type: 'start-game' });
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
      {selectedGame && !started && (
        <div className="game-details">
          <h3>Selected Game:</h3>
          <p>{games.find((game) => game.id === selectedGame)?.name}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button disabled={iAmReady} onClick={sendReady}>
              {iAmReady ? 'Ready ✓' : "I'm Ready"}
            </button>
            <button disabled={!allReady} onClick={startGame}>
              {allReady ? 'Start Game' : 'Waiting for everyone…'}
            </button>
          </div>
        </div>
      )}
      {started && <div className="game-details">Game starting…</div>}
    </div>
  );
};

export default GameSelection;
