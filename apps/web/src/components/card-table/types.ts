// Types for the card table module
export type GameId = string;
export type PlayerId = string;

export type Seat = { index: number; playerId: PlayerId | null; displayName?: string };
export type TableStatus = 'lobby' | 'started' | 'finished';

export type TableState = {
  gameId: GameId | null;
  seats: Seat[];
  status: TableStatus;
  hostId?: PlayerId;
  meta?: Record<string, any>;
};

export interface GameAdapter {
  id: GameId;
  players: number;
  initialState?: (seed?: string) => any;
  GameBoard?: React.ComponentType<any>;
  validateStart?: (state: TableState) => { ok: boolean; reason?: string };
}

export type GameDef = {
  id: GameId;
  name: string;
  players: number;
  description?: string;
  adapter?: GameAdapter;
};

export type SignalingClientLike = {
  send: (msg: any) => void;
  on?: (handler: (msg: any) => void) => () => void; // returns unsubscribe
};
