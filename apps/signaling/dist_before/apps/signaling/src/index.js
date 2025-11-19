import { createServer } from 'http';
import { fileURLToPath } from 'url';

import { createSignalingServer } from './server';
const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const httpServer = createServer();
// Export the factory so tests can create isolated servers. Only start the
// default listener when this module is run directly to avoid binding the
// port during test imports.
// In ESM we can't use `require.main === module`. Use import.meta.url to detect
// whether this file is the entry point.
const isMain =
  process.argv && process.argv[1] ? process.argv[1] === fileURLToPath(import.meta.url) : false;
if (isMain) {
  // create and attach the signaling server to the http server
  createSignalingServer(httpServer);
  httpServer.listen(port, () => {
    console.log(`[signaling] WebSocket server listening on ws://localhost:${port}`);
  });
}
export { createSignalingServer };
