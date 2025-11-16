import { createServer, Server } from 'http';
import WebSocket from 'ws';
import { createSignalingServer } from '../src/index';
import { describe, it, expect } from 'vitest';

function waitForType(ws: WebSocket, expectedType: string, timeout = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', handler as any);
      reject(new Error('timeout waiting for message type ' + expectedType));
    }, timeout);
    const handler = (data: any) => {
      try {
        const txt = data.toString();
        const parsed = JSON.parse(txt);
        if (parsed.type === expectedType) {
          clearTimeout(timer);
          ws.off('message', handler as any);
          resolve(txt);
        }
      } catch (e) {
        // ignore non-JSON
      }
    };
    ws.on('message', handler as any);
    ws.once('error', (err) => {
      clearTimeout(timer);
      ws.off('message', handler as any);
      reject(err);
    });
  });
}

describe('cross-instance sync', () => {
  it('propagates cardtable seat claims from server A to clients on server B', async () => {
    const httpA: Server = createServer();
    const httpB: Server = createServer();

    const sA = createSignalingServer(httpA);
    const sB = createSignalingServer(httpB);

    await new Promise<void>((resolve) => httpA.listen(0, resolve));
    await new Promise<void>((resolve) => httpB.listen(0, resolve));

    const portA = (httpA.address() as any).port;
    const portB = (httpB.address() as any).port;

    const a = new WebSocket(`ws://localhost:${portA}`);
    const b = new WebSocket(`ws://localhost:${portB}`);

    await Promise.all([
      new Promise<void>((res) => a.on('open', res)),
      new Promise<void>((res) => b.on('open', res)),
    ]);

    // both clients join the same logical room but on different server instances
    a.send(JSON.stringify({ type: 'join', room: 'room-cross' }));
    b.send(JSON.stringify({ type: 'join', room: 'room-cross' }));

    // give servers a moment to process subscriptions
    await new Promise((r) => setTimeout(r, 250));

    // A claims a seat
    a.send(JSON.stringify({ type: 'cardtable.seat.claim', seatIndex: 0, playerId: 'alice' }));

    const msg = await waitForType(b, 'cardtable.seat.update', 2000);
    const parsed = JSON.parse(msg);
    expect(parsed.type).toBe('cardtable.seat.update');
    expect(parsed.tableState).toBeDefined();
    expect(parsed.tableState.seats[0].playerId).toBe('alice');

    a.close();
    b.close();
    sA.wss.close();
    sB.wss.close();
    httpA.close();
    httpB.close();
  });
});
