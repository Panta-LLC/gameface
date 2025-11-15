import { WebSocketServer, WebSocket } from 'ws'; // Unified import for WebSocketServer and WebSocket
import type { RawData } from 'ws';
import type { Server } from 'http';
import * as RedisPubSubModule from '../../../services/signaling/src/redisPubSub';

// Debug module shape to handle ESM/CJS interop reliably
// eslint-disable-next-line no-console
console.log('[signaling] RedisPubSubModule keys:', Object.keys(RedisPubSubModule));
// Prefer named export, then default, else fall back to value itself if it's a function
const RedisExport: any =
  (RedisPubSubModule as any).RedisPubSub ||
  ((RedisPubSubModule as any).default && (RedisPubSubModule as any).default.RedisPubSub) ||
  (RedisPubSubModule as any).default ||
  RedisPubSubModule;
console.log('[signaling] RedisExport typeof:', typeof RedisExport);
if (typeof RedisExport === 'object') {
  console.log('[signaling] RedisExport object keys:', Object.keys(RedisExport));
}
const redisPubSub = new (RedisExport as any)();

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

    ws.on('message', (message: RawData) => {
      const text = typeof message === 'string' ? message : message.toString();
      console.log('Received message:', text);
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse incoming message as JSON:', e);
        return;
      }

      switch (data.type) {
        case 'join':
          console.log('Handling join event');
          handleJoin(ws, data);
          break;
        case 'offer':
          console.log('Handling offer event');
          handleOffer(ws, data);
          break;
        case 'answer':
          console.log('Handling answer event');
          handleAnswer(ws, data);
          break;
        case 'candidate':
          console.log('Handling candidate event');
          handleCandidate(ws, data);
          break;
        case 'leave':
          console.log('Handling leave event');
          handleLeave(ws, data);
          break;
        case 'GAME_SELECTION':
          console.log('Handling GAME_SELECTION event:', data);
          redisPubSub.publish('global', data);
          break;
        default:
          console.error('Unknown message type:', data.type);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  (async () => {
    await redisPubSub.subscribe('global', (message: object) => {
      console.log('Received Redis message on channel "global":', message);
      console.log('Broadcasting message to all clients:', message);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          console.log('Sending message to client:', message);
          client.send(JSON.stringify(message));
        }
      });
    });
  })();

  return { wss };
}

// Helper functions for signaling events
function handleJoin(ws: WebSocket, data: { room: string }) {
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
