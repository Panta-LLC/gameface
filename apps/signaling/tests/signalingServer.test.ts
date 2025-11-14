import { createServer, Server } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { createSignalingServer } from '../src/index';
import type { RawData } from 'ws';
import { beforeAll, afterAll, describe, it, expect, test } from 'vitest';

let httpServer: Server;
let signalingServer: { wss: WebSocketServer };
let clientSocket: WebSocket;

beforeAll(async () => {
  httpServer = createServer();
  signalingServer = createSignalingServer(httpServer);
  await new Promise<void>((resolve) => {
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      console.log(`Test server listening on ws://localhost:${port}`);
      clientSocket = new WebSocket(`ws://localhost:${port}`);
      clientSocket.on('open', () => {
        console.log('WebSocket client connected');
        resolve();
      });
      clientSocket.on('error', (err: Error) => {
        console.error('WebSocket client error:', err);
      });
    });
  });
});

afterAll(() => {
  clientSocket?.close();
  signalingServer?.wss.close();
  httpServer?.close();
});

test('should handle offer messages', async () => {
  const targetId = 'target-id';
  const offer = { type: 'offer', sdp: 'dummy-sdp' };

  await new Promise<void>((resolve) => {
    clientSocket.send(JSON.stringify({ targetId, offer }));
    clientSocket.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message).toEqual({ targetId, offer });
      resolve();
    });
  });
});
