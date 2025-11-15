import { WebSocketServer, WebSocket } from 'ws'; // Unified import for WebSocketServer and WebSocket
import type { RawData } from 'ws';
import type { Server } from 'http';
import { RedisPubSub } from '../../../services/signaling/src/redisPubSub';

const redisPubSub = new RedisPubSub();

(async () => {
  await redisPubSub.connect();
  console.log('RedisPubSub connected');
})();

export function createSignalingServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer });
  console.log('WebSocketServer created');

  // WebRTC Signaling Events
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    ws.on('message', (message: string) => {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'join':
          // Notify peers about the new user
          handleJoin(ws, data);
          break;
        case 'offer':
          // Relay offer to the target peer
          handleOffer(ws, data);
          break;
        case 'answer':
          // Relay answer to the target peer
          handleAnswer(ws, data);
          break;
        case 'candidate':
          // Relay ICE candidate to the target peer
          handleCandidate(ws, data);
          break;
        case 'leave':
          // Notify peers about the user leaving
          handleLeave(ws, data);
          break;
        default:
          console.error('Unknown message type:', data.type);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      // Handle cleanup if necessary
    });
  });

  (async () => {
    await redisPubSub.subscribe('global', (message: object) => {
      console.log('Broadcasting message to all clients:', message);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    });
  })();

  return { wss };
}

// Helper functions for signaling events
function handleJoin(ws: WebSocket, data: { room: string }) {
  // Notify other peers in the room
  console.log(`User joined room: ${data.room}`);
  // ...implementation...
}

function handleOffer(ws: WebSocket, data: { from: string; to: string; sdp: string }) {
  console.log(`Offer from ${data.from} to ${data.to}`);
  // ...implementation...
}

function handleAnswer(ws: WebSocket, data: { from: string; to: string; sdp: string }) {
  console.log(`Answer from ${data.from} to ${data.to}`);
  // ...implementation...
}

function handleCandidate(ws: WebSocket, data: { from: string; to: string; candidate: string }) {
  console.log(`Candidate from ${data.from} to ${data.to}`);
  // ...implementation...
}

function handleLeave(ws: WebSocket, data: { room: string }) {
  console.log(`User left room: ${data.room}`);
  // ...implementation...
}
