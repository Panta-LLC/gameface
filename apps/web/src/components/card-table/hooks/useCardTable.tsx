/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';

import type { GameDef, Seat, SignalingClientLike, TableState } from '../types';

// Simple in-memory event bus used when no signaling client is provided.
const globalCardTableBus = (() => {
  const target = new EventTarget();
  return {
    send(msg: any) {
      target.dispatchEvent(new CustomEvent('cardtable', { detail: msg }));
    },
    on(fn: (m: any) => void) {
      const handler = (e: Event) => fn((e as CustomEvent).detail);
      target.addEventListener('cardtable', handler as EventListener);
      return () => target.removeEventListener('cardtable', handler as EventListener);
    },
  };
})();

export function initEmptyTable(
  gameId: string | null,
  players: number,
  hostId?: string,
): TableState {
  const seats: Seat[] = Array.from({ length: players }).map((_, i) => ({
    index: i,
    playerId: null,
  }));
  return { gameId, seats, status: 'lobby', hostId };
}

type UseCardTableOptions = {
  signaling?: SignalingClientLike | null;
  initialGame?: GameDef | null;
  currentPlayerId: string;
};

export function useCardTable({ signaling, initialGame, currentPlayerId }: UseCardTableOptions): {
  tableState: TableState | null;
  pendingSeatClaim: number | null;
  takeSeat: (seatIndex: number) => void;
  leaveSeat: (seatIndex: number) => void;
  attemptStart: (adapter?: {
    validateStart?: (s: TableState) => { ok: boolean; reason?: string };
  }) => { ok: boolean; reason?: string } | void;
  selectGame: (gameDef: GameDef | null) => void;
  send: (msg: any) => void;
  signalingClient: SignalingClientLike;
} {
  const [tableState, setTableState] = useState<TableState | null>(() => {
    if (initialGame) return initEmptyTable(initialGame.id, initialGame.players, currentPlayerId);
    return null;
  });

  const [pendingSeatClaim, setPendingSeatClaim] = useState<number | null>(null);
  const signalingRef = useRef<SignalingClientLike | null>(signaling ?? null);

  useEffect(() => {
    signalingRef.current = signaling ?? null;
    let subscriber: (() => void) | undefined;

    const handleSignal = (msg: any) => {
      if (!msg || typeof msg !== 'object') return;
      switch (msg.type) {
        case 'cardtable.seat.update':
          setTableState(msg.tableState);
          setPendingSeatClaim(null);
          break;
        case 'cardtable.start':
          setTableState(msg.tableState);
          break;
        default:
          break;
      }
    };

    if (signaling?.on) subscriber = signaling.on((msg: any) => handleSignal(msg));
    const localUnsub = !signaling ? globalCardTableBus.on(handleSignal) : undefined;

    return () => {
      if (subscriber) subscriber();
      if (localUnsub) localUnsub();
    };
  }, [signaling]);

  const send = (msg: any) => {
    if (signalingRef.current) {
      signalingRef.current.send(msg);
    } else {
      globalCardTableBus.send(msg);
    }
  };

  // Expose a signaling client-like object (send + on) so consumers can both send
  // and subscribe to incoming messages. This ensures adapters receive the same
  // client the hook uses for broadcasting.
  const signalingClient: SignalingClientLike = {
    send: (m: any) => {
      if (signalingRef.current) signalingRef.current.send(m);
      else globalCardTableBus.send(m);
    },
    on: (handler?: (m: any) => void) => {
      if (signalingRef.current?.on) return signalingRef.current.on(handler as any);
      if (!handler) return () => {};
      return globalCardTableBus.on(handler as any);
    },
  };

  const takeSeat = (seatIndex: number) => {
    if (!tableState) return;
    // compute next state and apply optimistically
    const nextSeats = tableState.seats.map((t) =>
      t.index === seatIndex ? { ...t, playerId: currentPlayerId } : t,
    );
    const nextState = { ...tableState, seats: nextSeats };
    setTableState(nextState);
    setPendingSeatClaim(seatIndex);
    // If we have a real signaling client, emit a claim for server-side
    // reconciliation. If we're in local mode (no signaling), broadcast an
    // authoritative update so other local clients will receive the new state.
    if (signalingRef.current) {
      send({
        type: 'cardtable.seat.claim',
        seatIndex,
        playerId: currentPlayerId,
        tableId: tableState.gameId,
      });
    } else {
      send({ type: 'cardtable.seat.update', tableState: nextState });
    }
  };

  const leaveSeat = (seatIndex: number) => {
    if (!tableState) return;
    const nextSeats = tableState.seats.map((t) =>
      t.index === seatIndex ? { ...t, playerId: null } : t,
    );
    const nextState = { ...tableState, seats: nextSeats };
    setTableState(nextState);
    // similar to takeSeat: prefer authoritative update in local mode
    if (signalingRef.current) {
      send({
        type: 'cardtable.seat.release',
        seatIndex,
        playerId: currentPlayerId,
        tableId: tableState.gameId,
      });
    } else {
      send({ type: 'cardtable.seat.update', tableState: nextState });
    }
  };

  const attemptStart = (adapter?: {
    validateStart?: (s: TableState) => { ok: boolean; reason?: string };
  }) => {
    if (!tableState) return;
    if (adapter?.validateStart) {
      const res = adapter.validateStart(tableState);
      if (!res.ok) return { ok: false, reason: res.reason };
    } else {
      const filled = tableState.seats.every((s) => s.playerId !== null);
      if (!filled) return { ok: false, reason: 'Seats are not full' };
    }
    const nextState: TableState = { ...tableState, status: 'started' };
    send({ type: 'cardtable.start', tableState: nextState, tableId: tableState.gameId });
    setTableState(nextState);
    return { ok: true };
  };

  const selectGame = (gameDef: GameDef | null) => {
    if (!gameDef) {
      setTableState(null);
      return;
    }
    const t = initEmptyTable(gameDef.id, gameDef.players, currentPlayerId);
    setTableState(t);
    // broadcast initial state so others can pick it up in local mode
    send({ type: 'cardtable.seat.update', tableState: t });
  };

  return {
    tableState,
    pendingSeatClaim,
    takeSeat,
    leaveSeat,
    attemptStart,
    selectGame,
    send,
    signalingClient,
  };
}
