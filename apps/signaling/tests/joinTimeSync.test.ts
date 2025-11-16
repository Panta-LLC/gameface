import { createServer, Server } from 'http';
import WebSocket from 'ws';
import { createSignalingServer } from '../src/index';
import { describe, it, expect } from 'vitest';

function waitForMessages(ws: WebSocket, count = 1, timeout = 3000): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const messages: string[] = [];
    const timer = setTimeout(() => reject(new Error('timeout waiting for messages')), timeout);
    const handler = (data: any) => {
      messages.push(data.toString());
      if (messages.length >= count) {
        clearTimeout(timer);
        ws.off('message', handler as any);
        resolve(messages);
      }
    };
    ws.on('message', handler as any);
    ws.on('error', (err) => {
      clearTimeout(timer);
      ws.off('message', handler as any);
      reject(err);
    });
  });
}

describe('join-time sync', () => {
  it('sends game-selected and activity-selected to a late joiner', async () => {
    const httpServer: Server = createServer();
    const { wss } = createSignalingServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (wss.address() as any).port;

    const a = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => a.on('open', resolve));

    // A joins and selects game + activity
    a.send(JSON.stringify({ type: 'join', room: 'room-join-sync' }));
    a.send(JSON.stringify({ type: 'select-game', game: 'spades' }));
    a.send(JSON.stringify({ type: 'select-activity', activity: 'card-table' }));

    // give server a short moment to process
    await new Promise((r) => setTimeout(r, 50));

    const b = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => b.on('open', resolve));

    // B will join the room and should receive at least game-selected and activity-selected
    b.send(JSON.stringify({ type: 'join', room: 'room-join-sync' }));

    const msgs = await waitForMessages(b, 2, 2000);
    const types = msgs.map((m) => JSON.parse(m).type).sort();
    expect(types).toEqual(['activity-selected', 'game-selected']);

    a.close();
    b.close();
    wss.close();
    httpServer.close();
  });
});
