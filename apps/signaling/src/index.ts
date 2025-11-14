import { WebSocketServer } from 'ws';
import type { WebSocket, RawData } from 'ws';

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const wss = new WebSocketServer({ port });

wss.on('connection', (ws: WebSocket) => {
  ws.send(JSON.stringify({ type: 'hello', payload: 'Welcome to Gameface signaling' }));
  ws.on('message', (data: RawData) => {
    // Echo back for now
    ws.send(data);
  });
});

// eslint-disable-next-line no-console
console.log(`[signaling] WebSocket server listening on ws://localhost:${port}`);
