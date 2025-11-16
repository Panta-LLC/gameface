import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';
import { createSignalingServer } from '../src/server';

function waitForMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout waiting for message')), 3000);
    ws.once('message', (data) => {
      clearTimeout(timer);
      resolve(data.toString());
    });
    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

describe('Signaling WebSocket', () => {
  it('sends hello then echoes messages', async () => {
    // Use ephemeral port
    const httpServer = require('http').createServer();
    const { wss } = createSignalingServer(httpServer);
    httpServer.listen(0); // Use ephemeral port
    const address = wss.address();
    if (typeof address === 'string' || address == null) throw new Error('unexpected address type');
    const port = address.port;

    const ws = new WebSocket(`ws://localhost:${port}`);
    const hello = await waitForMessage(ws);
    expect(hello).toMatch(/hello/);

    ws.send(JSON.stringify({ type: 'ping', payload: 'world' }));
    const echo = await waitForMessage(ws);
    expect(echo).toMatch(/world/);

    ws.close();
    wss.close();
  });

  it('sends current card table state to a client that joins after the table was set', async () => {
    const httpServer = require('http').createServer();
    const { wss } = createSignalingServer(httpServer);
    httpServer.listen(0);
    const address = wss.address();
    if (typeof address === 'string' || address == null) throw new Error('unexpected address type');
    const port = address.port;

    const wsA = new WebSocket(`ws://localhost:${port}`);
    // consume any initial hello message
    await waitForMessage(wsA);

    const wsB = new WebSocket(`ws://localhost:${port}`);
    await waitForMessage(wsB);

    // A joins room and sets a table state
    wsA.send(JSON.stringify({ type: 'join', room: 'room-1' }));
    // wait for peer-joined broadcast (none yet since B not in room)
    // now A publishes an authoritative table state
    const tableState = {
      gameId: 'spades',
      seats: [{ index: 0, playerId: 'alice' }],
      status: 'lobby',
    };
    wsA.send(JSON.stringify({ type: 'cardtable.seat.update', tableState }));
    // A should receive the broadcast of the normalized table state
    const gotA = await waitForMessage(wsA);
    expect(gotA).toMatch(/cardtable.seat.update/);

    // Now B joins the same room; the server should send the existing table state
    wsB.send(JSON.stringify({ type: 'join', room: 'room-1' }));
    const gotB = await waitForMessage(wsB);
    expect(gotB).toMatch(/cardtable.seat.update/);

    wsA.close();
    wsB.close();
    wss.close();
  });
});
