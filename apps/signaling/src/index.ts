import { createServer } from 'http';
import { createSignalingServer } from './server';

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const httpServer = createServer();
const { wss } = createSignalingServer(httpServer);

httpServer.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[signaling] WebSocket server listening on ws://localhost:${port}`);
});

export { wss, createSignalingServer };
