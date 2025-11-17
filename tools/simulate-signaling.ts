import WebSocket from 'ws';

const URL = 'ws://localhost:3001';
const ROOM = 'integration-test-room';

function makeClient(index: number) {
  const ws = new WebSocket(URL);
  ws.on('open', () => {
    console.log(`client${index} open`);
    ws.send(JSON.stringify({ type: 'join', room: ROOM }));
  });
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(String(data));
      console.log(`client${index} recv:`, JSON.stringify(msg));
    } catch (e) {
      console.log(`client${index} recv (raw):`, String(data));
    }
  });
  ws.on('error', (err) => {
    console.error(`client${index} error:`, err.message || err);
  });
  ws.on('close', () => {
    console.log(`client${index} closed`);
  });
  return ws;
}

async function run() {
  const clients = [makeClient(1), makeClient(2), makeClient(3)];

  // let the simulation run for a few seconds
  setTimeout(() => {
    console.log('closing clients');
    clients.forEach((c) => c.close());
    setTimeout(() => process.exit(0), 200);
  }, 5000);
}

run().catch((e) => {
  console.error('simulation error', e);
  process.exit(1);
});
