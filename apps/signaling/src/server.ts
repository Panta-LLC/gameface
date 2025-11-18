import type { Server } from 'http';
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RawData } from 'ws';
import { WebSocket, WebSocketServer } from 'ws'; // Unified import for WebSocketServer and WebSocket

import * as RedisPubSubModule from '../../../services/signaling/src/redisPubSub';

// Debug module shape to handle ESM/CJS interop reliably

console.log('[signaling] RedisPubSubModule keys:', Object.keys(RedisPubSubModule));
// Prefer named export, then default, else fall back to value itself if it's a function
const RedisExport: any =
  (RedisPubSubModule as any).RedisPubSub ||
  ((RedisPubSubModule as any).default && (RedisPubSubModule as any).default.RedisPubSub) ||
  (RedisPubSubModule as any).default ||
  RedisPubSubModule;
console.log('[signaling] RedisExport typeof:', typeof RedisExport);
if (typeof RedisExport === 'object') {
  console.log('[signaling] RedisExport object keys:', Object.keys(RedisExport));
}
const redisPubSub = new (RedisExport as any)();

export function createSignalingServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer });
  console.log('WebSocketServer created');

  // Unique id for this server instance so we can ignore our own pub/sub messages
  const instanceId = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // In-memory room management
  const rooms = new Map<string, Set<WebSocket>>();
  const socketRoom = new WeakMap<WebSocket, string>();
  const socketId = new WeakMap<WebSocket, string>();
  let nextId = 1;

  const joinRoom = (ws: WebSocket, room: string) => {
    const set = rooms.get(room) || new Set<WebSocket>();
    set.add(ws);
    rooms.set(room, set);
    socketRoom.set(ws, room);
    if (!socketId.get(ws)) socketId.set(ws, String(nextId++));
    console.log(`[signaling] socket joined room ${room}. Size=${set.size}`);
  };

  const leaveRoom = (ws: WebSocket) => {
    const room = socketRoom.get(ws);
    if (!room) return;
    const set = rooms.get(room);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        rooms.delete(room);
        // If the room is empty and the game finished, remove persisted state.
        try {
          const s = tables.get(room);
          if (s && s.status === 'finished') {
            void redisPubSub.del(`signaling:room:${room}:state`);
          }
        } catch (e) {
          console.error('Failed to clean up persisted room state', e);
        }
      }
    }
    socketRoom.delete(ws);
    console.log(`[signaling] socket left room ${room}. Size=${rooms.get(room)?.size ?? 0}`);
  };

  const broadcastToRoom = (room: string, payload: any, exclude?: WebSocket) => {
    const set = rooms.get(room);
    if (!set) return;
    const text = JSON.stringify(payload);
    set.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    });
  };

  const gameSelection = new Map<string, string>();
  const activitySelection = new Map<string, string>();
  const readiness = new Map<string, Set<WebSocket>>();
  // Card table authoritative state per room
  type Seat = { index: number; playerId: string | null; displayName?: string };
  type TableState = {
    gameId: string | null;
    seats: Seat[];
    status: 'lobby' | 'started' | 'finished';
    hostId?: string;
  };
  const tables = new Map<string, TableState>();

  const initEmptyTable = (gameId: string | null, players = 4, hostId?: string): TableState => {
    const seats: Seat[] = Array.from({ length: players }).map((_, i) => ({
      index: i,
      playerId: null,
    }));
    return { gameId, seats, status: 'lobby', hostId };
  };

  const setGameForRoom = (room: string, game: string) => {
    gameSelection.set(room, game);
    readiness.set(room, new Set());
    // publish game selection to other instances
    try {
      void redisPubSub.publish(`signaling:room:${room}`, {
        source: instanceId,
        type: 'game-selected',
        room,
        game,
      });
    } catch (e) {
      console.error('Failed to publish game-selected', e);
    }
    // persist canonical room state
    void persistRoomState(room);
  };

  // Persist the combined room state (game, activity, card table) to Redis
  const persistRoomState = async (room: string) => {
    try {
      const payload = {
        game: gameSelection.get(room) ?? null,
        activity: activitySelection.get(room) ?? null,
        tableState: tables.get(room) ?? null,
      };
      // ensure connection, then set
      await redisPubSub.connect();
      const ttl = Number(process.env.SIGNALING_ROOM_TTL_SECONDS) || 60 * 60 * 24; // default 24h
      if (typeof (redisPubSub as any).setWithTTL === 'function') {
        await (redisPubSub as any).setWithTTL(`signaling:room:${room}:state`, payload, ttl);
      } else {
        await redisPubSub.set(`signaling:room:${room}:state`, payload);
      }
    } catch (e) {
      console.error('Failed to persist room state', e);
    }
  };

  const markReady = (ws: WebSocket) => {
    const room = socketRoom.get(ws);
    if (!room) return;
    const readySet = readiness.get(room);
    if (readySet) {
      readySet.add(ws);
      broadcastToRoom(room, { type: 'ready', id: socketId.get(ws) });
      if (readySet.size === rooms.get(room)?.size) {
        broadcastToRoom(room, { type: 'all-ready' });
      }
    }
  };

  const startGame = (room: string) => {
    const game = gameSelection.get(room);
    if (!game) return console.warn('start game without game selection');
    broadcastToRoom(room, { type: 'start-game', game });
  };

  // WebRTC Signaling Events
  // Connect to Redis and subscribe once per server instance to all per-room channels and route messages
  void redisPubSub
    .connect()
    .then(() => {
      console.log('RedisPubSub connected (server-level)');
      void redisPubSub.psubscribe('signaling:room:*', (msg: any, _channel: string) => {
        try {
          if (!msg || msg.source === instanceId) return; // ignore our own messages
          const { type, room } = msg;
          if (!room) return;
          switch (type) {
            case 'game-selected':
              gameSelection.set(room, msg.game);
              broadcastToRoom(room, { type: 'game-selected', game: msg.game });
              break;
            case 'activity-selected':
              activitySelection.set(room, msg.activity);
              broadcastToRoom(room, { type: 'activity-selected', activity: msg.activity });
              break;
            case 'cardtable.seat.update':
              // merge/overwrite canonical table state and broadcast
              if (msg.tableState) {
                tables.set(room, msg.tableState);
                broadcastToRoom(room, {
                  type: 'cardtable.seat.update',
                  tableState: msg.tableState,
                });
              }
              break;
            case 'cardtable.start':
              if (msg.tableState) {
                tables.set(room, msg.tableState);
                broadcastToRoom(room, {
                  type: 'cardtable.start',
                  ok: true,
                  tableState: msg.tableState,
                });
              }
              break;
            default:
              break;
          }
        } catch (e) {
          console.error('Error handling redis pubsub message', e);
        }
      });
    })
    .catch((e: any) => {
      console.error('Failed to connect to RedisPubSub for server', e);
    });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    // Make the message handler async so we can load persisted room state on join
    ws.on('message', async (message: RawData) => {
      const text = typeof message === 'string' ? message : message.toString();
      console.log('Received message:', text);
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse incoming message as JSON:', e);
        return;
      }

      switch (data.type) {
        case 'join': {
          const room: string = data.room;
          if (!room) {
            console.warn('join missing room');
            return;
          }
          joinRoom(ws, room);
          // Send a welcome message with this socket's id so clients can
          // identify themselves for peer-to-peer signaling.
          try {
            ws.send(JSON.stringify({ type: 'welcome', id: socketId.get(ws) }));
          } catch (e) {
            console.error('Failed to send welcome id to joiner', e);
          }
          // notify other peers a new peer joined
          broadcastToRoom(room, { type: 'peer-joined', id: socketId.get(ws) }, ws);
          // If we don't have state in-memory for this room, attempt to load
          // the persisted room state from Redis so late-joiners (and new
          // server instances) can recover ongoing games.
          try {
            const persisted = await redisPubSub.get(`signaling:room:${room}:state`);
            if (persisted) {
              // Restore persisted values into our in-memory maps
              if (persisted.game) gameSelection.set(room, persisted.game);
              if (persisted.activity) activitySelection.set(room, persisted.activity);
              if (persisted.tableState) tables.set(room, persisted.tableState);
            }
          } catch (e) {
            console.error('Failed to load persisted room state for joiner', e);
          }

          // If we have a selected game/activity, send those to the joining socket
          // so late-joiners are fully in sync.
          const selectedGame = gameSelection.get(room);
          if (selectedGame) {
            try {
              ws.send(JSON.stringify({ type: 'game-selected', game: selectedGame }));
            } catch (e) {
              console.error('Failed to send selectedGame to joiner', e);
            }
          }
          const selectedActivity = activitySelection.get(room);
          if (selectedActivity) {
            try {
              ws.send(JSON.stringify({ type: 'activity-selected', activity: selectedActivity }));
            } catch (e) {
              console.error('Failed to send selectedActivity to joiner', e);
            }
          }

          // If we have an authoritative card table for this room, send it
          // directly to the joining socket so late-joiners are in sync.
          const existing = tables.get(room);
          if (existing) {
            try {
              ws.send(JSON.stringify({ type: 'cardtable.seat.update', tableState: existing }));
            } catch (e) {
              console.error('Failed to send existing tableState to joiner', e);
            }
          }
          break;
        }
        case 'select-game': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('select-game without room');
          if (!data.game) return console.warn('select-game missing game');
          setGameForRoom(room, data.game);
          broadcastToRoom(room, { type: 'game-selected', game: data.game });
          break;
        }
        case 'select-activity': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('select-activity without room');
          if (!data.activity) return console.warn('select-activity missing activity');
          activitySelection.set(room, data.activity);
          broadcastToRoom(room, { type: 'activity-selected', activity: data.activity });
          try {
            void redisPubSub.publish(`signaling:room:${room}`, {
              source: instanceId,
              type: 'activity-selected',
              room,
              activity: data.activity,
            });
          } catch (e) {
            console.error('Failed to publish activity-selected', e);
          }
          // persist canonical room state
          void persistRoomState(room);
          break;
        }
        case 'offer': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('offer without room');
          broadcastToRoom(room, { type: 'offer', sdp: data.sdp, id: socketId.get(ws) }, ws);
          break;
        }
        case 'answer': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('answer without room');
          broadcastToRoom(room, { type: 'answer', sdp: data.sdp, id: socketId.get(ws) }, ws);
          break;
        }
        case 'candidate': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('candidate without room');
          broadcastToRoom(
            room,
            { type: 'candidate', candidate: data.candidate, id: socketId.get(ws) },
            ws,
          );
          break;
        }
        case 'leave': {
          const prev = socketRoom.get(ws);
          leaveRoom(ws);
          if (prev) {
            broadcastToRoom(prev, { type: 'peer-left', id: socketId.get(ws) });
          }
          break;
        }
        case 'ready': {
          markReady(ws);
          break;
        }
        case 'start-game': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('start-game without room');
          startGame(room);
          break;
        }
        // Card table messages (authoritative processing)
        case 'cardtable.seat.claim': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('cardtable.seat.claim without room');
          const { seatIndex, playerId, tableId } = data;
          if (typeof seatIndex !== 'number' || !playerId)
            return console.warn('invalid claim payload');
          const cur = tables.get(room) || initEmptyTable(tableId ?? null, 4);
          // Ensure we respect current occupancy
          if (cur.seats[seatIndex] && cur.seats[seatIndex].playerId === null) {
            cur.seats[seatIndex].playerId = playerId;
            tables.set(room, cur);
          } else {
            // If seat taken, do not overwrite — we'll broadcast current state back
            console.log('claim rejected, seat occupied');
          }
          broadcastToRoom(room, { type: 'cardtable.seat.update', tableState: cur });
          try {
            void redisPubSub.publish(`signaling:room:${room}`, {
              source: instanceId,
              type: 'cardtable.seat.update',
              room,
              tableState: cur,
            });
          } catch (e) {
            console.error('Failed to publish cardtable.seat.update', e);
          }
          // persist canonical room state
          void persistRoomState(room);
          break;
        }
        case 'cardtable.seat.release': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('cardtable.seat.release without room');
          const { seatIndex, playerId, tableId } = data;
          if (typeof seatIndex !== 'number' || !playerId)
            return console.warn('invalid release payload');
          const cur = tables.get(room) || initEmptyTable(tableId ?? null, 4);
          if (cur.seats[seatIndex] && cur.seats[seatIndex].playerId === playerId) {
            cur.seats[seatIndex].playerId = null;
            tables.set(room, cur);
          }
          broadcastToRoom(room, { type: 'cardtable.seat.update', tableState: cur });
          try {
            void redisPubSub.publish(`signaling:room:${room}`, {
              source: instanceId,
              type: 'cardtable.seat.update',
              room,
              tableState: cur,
            });
          } catch (e) {
            console.error('Failed to publish cardtable.seat.update', e);
          }
          // persist canonical room state
          void persistRoomState(room);
          break;
        }
        case 'cardtable.seat.update': {
          // Accept authoritative update from a client (useful for non-server/local fallback
          // this ensures admins or relay clients can set the table). Merge into server state and broadcast.
          const room = socketRoom.get(ws);
          if (!room) return console.warn('cardtable.seat.update without room');
          const { tableState } = data;
          if (!tableState) return console.warn('cardtable.seat.update missing tableState');
          // Basic validation/normalization
          const normalized: TableState = {
            gameId: tableState.gameId ?? null,
            seats: Array.isArray(tableState.seats)
              ? tableState.seats.map((s: any, i: number) => ({
                  index: i,
                  playerId: s.playerId ?? null,
                }))
              : initEmptyTable(tableState.gameId ?? null, 4).seats,
            status: tableState.status ?? 'lobby',
            hostId: tableState.hostId,
          };
          tables.set(room, normalized);
          broadcastToRoom(room, { type: 'cardtable.seat.update', tableState: normalized });
          try {
            void redisPubSub.publish(`signaling:room:${room}`, {
              source: instanceId,
              type: 'cardtable.seat.update',
              room,
              tableState: normalized,
            });
          } catch (e) {
            console.error('Failed to publish cardtable.seat.update', e);
          }
          // persist canonical room state
          void persistRoomState(room);
          break;
        }
        case 'cardtable.start': {
          const room = socketRoom.get(ws);
          if (!room) return console.warn('cardtable.start without room');
          const { tableState } = data;
          const cur = tables.get(room) || (tableState ? tableState : initEmptyTable(null, 4));
          // validate seats full
          const filled = cur.seats.every((s: Seat) => s.playerId !== null);
          if (!filled) {
            // broadcast current state as rejection (clients can handle)
            broadcastToRoom(room, {
              type: 'cardtable.start',
              ok: false,
              reason: 'Seats not full',
              tableState: cur,
            });
            break;
          }
          cur.status = 'started';
          tables.set(room, cur);
          broadcastToRoom(room, { type: 'cardtable.start', ok: true, tableState: cur });
          try {
            void redisPubSub.publish(`signaling:room:${room}`, {
              source: instanceId,
              type: 'cardtable.start',
              room,
              tableState: cur,
            });
          } catch (e) {
            console.error('Failed to publish cardtable.start', e);
          }
          // persist canonical room state
          void persistRoomState(room);
          break;
        }
        default: {
          // For unrecognized messages (and tests that expect a simple echo),
          // echo the received payload back to the sender. This keeps test
          // behavior simple while not affecting room-based flows.
          try {
            ws.send(text);
          } catch (e) {
            console.error('Failed to echo message back to sender', e);
          }
          break;
        }
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      leaveRoom(ws);
    });
  });

  return { wss };
}
