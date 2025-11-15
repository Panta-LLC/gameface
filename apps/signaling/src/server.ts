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

  // In-memory room management
  const rooms = new Map<string, Set<WebSocket>>();
  const socketRoom = new WeakMap<WebSocket, string>();

  const joinRoom = (ws: WebSocket, room: string) => {
    const set = rooms.get(room) || new Set<WebSocket>();
    set.add(ws);
    rooms.set(room, set);
    socketRoom.set(ws, room);
    console.log(`[signaling] socket joined room ${room}. Size=${set.size}`);
  };

  const leaveRoom = (ws: WebSocket) => {
    const room = socketRoom.get(ws);
    if (!room) return;
    const set = rooms.get(room);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        rooms.delete(room);
      }
    }
    socketRoom.delete(ws);
    console.log(`[signaling] socket left room ${room}. Size=${rooms.get(room)?.size ?? 0}`);
  };

  const broadcastToRoom = (room: string, payload: any, exclude?: WebSocket) => {
    const set = rooms.get(room);
    if (!set) return;
    const text = JSON.stringify(payload);
    set.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    });
  };

  const gameSelection = new Map<string, string>();
  const readiness = new Map<string, Set<WebSocket>>();

  const setGameForRoom = (room: string, game: string) => {
    gameSelection.set(room, game);
    readiness.set(room, new Set());
  };

  const markReady = (ws: WebSocket) => {
    const room = socketRoom.get(ws);
    if (!room) return;
    const readySet = readiness.get(room);
    if (readySet) {
      readySet.add(ws);
      broadcastToRoom(room, { type: 'ready', user: ws }, ws);
      if (readySet.size === rooms.get(room)?.size) {
        broadcastToRoom(room, { type: 'all-ready' });
      }
    }
  };

  const startGame = (room: string) => {
    const game = gameSelection.get(room);
    if (!game) return console.warn('start game without game selection');
    broadcastToRoom(room, { type: 'start-game', game });
  };

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
        case 'join': {
          const room: string = data.room;
          if (!room) {
            console.warn('join missing room');
            return;
          }
          joinRoom(ws, room);
          broadcastToRoom(room, { type: 'peer-joined' }, ws);
          break;
        }
        case 'offer': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('offer without room');
          broadcastToRoom(room, { type: 'offer', sdp: data.sdp }, ws);
          break;
        }
        case 'answer': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('answer without room');
          broadcastToRoom(room, { type: 'answer', sdp: data.sdp }, ws);
          break;
        }
        case 'candidate': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('candidate without room');
          broadcastToRoom(room, { type: 'candidate', candidate: data.candidate }, ws);
          break;
        }
        case 'leave': {
          const prev = socketRoom.get(ws);
          leaveRoom(ws);
          if (prev) {
            broadcastToRoom(prev, { type: 'peer-left' });
          }
          break;
        }
        case 'ready': {
          markReady(ws);
          break;
        }
        case 'start-game': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('start-game without room');
          startGame(room);
          break;
        }
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      leaveRoom(ws);
    });
  });

  return wss;
}
