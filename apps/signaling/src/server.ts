import { WebSocketServer } from 'ws';
import type { WebSocket, RawData } from 'ws';
import type { Server } from 'http';

export function createSignalingServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer });
  console.log('WebSocketServer created');

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket connection established');
    ws.send(JSON.stringify({ type: 'hello', payload: 'Welcome to Gameface signaling' }));
    ws.on('message', (data: RawData) => {
      console.log('Message received:', data.toString());
      // Echo back for now
      ws.send(data);
    });
  });

  return { wss };
}
