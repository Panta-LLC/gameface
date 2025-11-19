import type { Server } from 'http';
export declare function createSignalingServer(httpServer: Server): {
  wss: import('ws').Server<typeof import('ws'), typeof import('http').IncomingMessage>;
};
