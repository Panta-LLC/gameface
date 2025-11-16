import { createServer } from 'http';
import { createSignalingServer } from './server';

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const httpServer = createServer();

// Export the factory so tests can create isolated servers. Only start the
// default listener when this module is run directly to avoid binding the
// port during test imports.
const created = createSignalingServer(httpServer);

if (require.main === module) {
  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[signaling] WebSocket server listening on ws://localhost:${port}`);
  });
}

export { createSignalingServer };
