import { WebSocketServer } from 'ws';
import type { WebSocket, RawData } from 'ws';

export function createSignalingServer(port: number) {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket) => {
    ws.send(JSON.stringify({ type: 'hello', payload: 'Welcome to Gameface signaling' }));
    ws.on('message', (data: RawData) => {
      // Echo back for now
      ws.send(data);
    });
  });

  return { wss };
}
