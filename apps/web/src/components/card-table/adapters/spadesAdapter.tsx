import React, { useEffect, useMemo, useState } from 'react';
import type { GameAdapter } from '../types';
import SpadesRules from '../rules/spadesRules';

// Minimal card utilities for a 52-card deck
const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

type Card = { code: string; suit: string; rank: string; value: number };

function createDeck(): Card[] {
  const out: Card[] = [];
  for (const s of SUITS) {
    for (let i = 0; i < RANKS.length; i++) {
      const r = RANKS[i];
      out.push({ code: `${r}${s}`, suit: s, rank: r, value: 2 + i });
    }
  }
  return out;
}

// Simple seeded RNG (mulberry32)
function seedFn(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], seed = Date.now()) {
  const rnd = seedFn(Number(seed) & 0xffffffff);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deal(deck: Card[], players: number) {
  const hands: Record<number, Card[]> = {};
  for (let p = 0; p < players; p++) hands[p] = [];
  let idx = 0;
  while (idx < deck.length) {
    for (let p = 0; p < players && idx < deck.length; p++) {
      hands[p].push(deck[idx++]);
    }
  }
  return hands;
}

export const spadesAdapter: GameAdapter = {
  id: 'spades',
  players: 4,
  initialState: (seed?: string | number) => ({ deckSeed: seed ?? Date.now(), hands: {} }),
  validateStart: (state) => {
    const filled = state.seats.every((s) => s.playerId !== null);
    return {
      ok: filled,
      reason: filled ? undefined : `All ${state.seats.length} seats must be filled to start Spades`,
    };
  },
  GameBoard: function SpadesBoard({ tableState, playerId, signaling }: any) {
    const players = tableState.seats.length;
    const mySeat = tableState.seats.find((s: any) => s.playerId === playerId)?.index ?? -1;

    const [seed] = useState<number>(() => Date.now());
    const [hands, setHands] = useState<Record<number, Card[]>>(() => ({}));
    const [turn, setTurn] = useState<number>(0);
    const [trick, setTrick] = useState<Array<{ player: number; card: Card }>>([]);
    const [tricksWon, setTricksWon] = useState<Record<number, number>>(() => ({}));
    const [started, setStarted] = useState<boolean>(false);

    // initialize hands when the table starts
    useEffect(() => {
      if (tableState.status !== 'started') return;
      // create, shuffle, and deal
      const deck = shuffle(createDeck(), seed);
      const dealt = deal(deck, players);
      setHands(dealt);
      setTurn(0);
      setTrick([]);
      setTricksWon(Object.fromEntries(Array.from({ length: players }).map((_, i) => [i, 0])));
      setStarted(true);
      // broadcast optional start event
      signaling?.send?.({ type: 'spades.start', seed, players, tableId: tableState.gameId });
    }, [tableState.status]);

    // subscribe to incoming signaling messages when available
    useEffect(() => {
      if (!signaling?.on) return;
      const unsub = signaling.on((msg: any) => {
        if (!msg || typeof msg !== 'object') return;
        switch (msg.type) {
          case 'spades.start': {
            // remote start: reconstruct hands using provided seed
            const deck = shuffle(createDeck(), msg.seed ?? seed);
            const dealt = deal(deck, players);
            setHands(dealt);
            setTurn(0);
            setTrick([]);
            setTricksWon(Object.fromEntries(Array.from({ length: players }).map((_, i) => [i, 0])));
            setStarted(true);
            break;
          }
          case 'spades.play': {
            const { player, card } = msg;
            // remove card from that player's hand if present and append to trick
            setHands((prev) => {
              const copy = { ...prev } as Record<number, Card[]>;
              copy[player] = [...(copy[player] || [])];
              const idx = copy[player].findIndex((c) => c.code === card.code);
              if (idx >= 0) copy[player].splice(idx, 1);
              return copy;
            });
            setTrick((prev) => {
              const next = [...prev, { player: msg.player, card }];
              setTurn((t) => (t + 1) % players);
              if (next.length >= players) {
                setTimeout(() => resolveTrick(), 250);
              }
              return next;
            });
            break;
          }
          default:
            break;
        }
      });
      return () => unsub && unsub();
    }, [signaling, seed, players]);

    // helper to check if a play is legal (follow suit)
    function canPlay(playerIndex: number, card: Card) {
      if (!started) return false;
      if (playerIndex !== turn) return false;
      const currentTrick = trick;
      if (currentTrick.length === 0) return true; // can lead any card
      const ledSuit = currentTrick[0].card.suit;
      const playerHand = hands[playerIndex] || [];
      const hasLedSuit = playerHand.some((c) => c.suit === ledSuit);
      if (hasLedSuit && card.suit !== ledSuit) return false; // must follow
      return true;
    }

    // resolve trick: determine winner and update state
    function resolveTrick(nextTurnCandidate?: number) {
      if (trick.length === 0) return;
      const ledSuit = trick[0].card.suit;
      // find if any spades were played
      const spadesPlayed = trick.filter((t) => t.card.suit === 'S');
      let winner: { player: number; card: Card } | null = null;
      if (spadesPlayed.length > 0) {
        winner = spadesPlayed.reduce((a, b) => (a.card.value > b.card.value ? a : b));
      } else {
        const sameSuit = trick.filter((t) => t.card.suit === ledSuit);
        winner = sameSuit.reduce((a, b) => (a.card.value > b.card.value ? a : b));
      }

      if (!winner) return;
      setTricksWon((prev) => ({ ...prev, [winner!.player]: (prev[winner!.player] || 0) + 1 }));
      setTurn(winner.player);
      setTrick([]);
      // broadcast trick result
      signaling?.send?.({
        type: 'spades.trick',
        winner: winner.player,
        trick,
        tableId: tableState.gameId,
      });
    }

    function playCard(card: Card) {
      const playerIndex = mySeat;
      if (playerIndex < 0) return;
      if (!canPlay(playerIndex, card)) return;
      // remove card from hand
      setHands((prev) => {
        const copy = { ...prev, [playerIndex]: [...(prev[playerIndex] || [])] };
        const idx = copy[playerIndex].findIndex((c) => c.code === card.code);
        if (idx >= 0) copy[playerIndex].splice(idx, 1);
        return copy;
      });
      // append to trick
      setTrick((prev) => {
        const next = [...prev, { player: playerIndex, card }];
        // advance turn to next player
        setTurn((t) => (t + 1) % players);
        // if trick is complete, resolve after a tiny delay to allow UI update
        if (next.length >= players) {
          setTimeout(() => resolveTrick(), 250);
        }
        // broadcast move
        signaling?.send?.({
          type: 'spades.play',
          player: playerIndex,
          card,
          tableId: tableState.gameId,
        });
        return next;
      });
    }

    // compute whether game finished (no cards left for any player)
    const finished = useMemo(() => {
      if (!started) return false;
      return Object.values(hands).every((h) => h.length === 0);
    }, [hands, started]);

    useEffect(() => {
      if (finished) {
        // compute simple scores
        const scores = Object.fromEntries(
          Object.entries(tricksWon).map(([k, v]) => [k, Number(v) * 10]),
        );
        signaling?.send?.({ type: 'spades.finish', scores, tableId: tableState.gameId });
      }
    }, [finished]);

    return (
      <div style={{ padding: 12 }}>
        <h4>Spades</h4>
        <div style={{ marginBottom: 8 }}>
          <strong>Table:</strong> {tableState.gameId} — status: {tableState.status}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h5>Your hand {mySeat >= 0 ? `(seat ${mySeat})` : ''}</h5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(hands[mySeat] || []).map((c) => (
                <button
                  key={c.code}
                  onClick={() => playCard(c)}
                  disabled={!canPlay(mySeat, c)}
                  style={{ padding: '6px 8px' }}
                >
                  {c.code}
                </button>
              ))}
              {(hands[mySeat] || []).length === 0 && <div style={{ color: '#666' }}>No cards</div>}
            </div>
          </div>

          <div style={{ width: 320 }}>
            <h5>Current trick</h5>
            <div style={{ minHeight: 80, border: '1px solid #eee', padding: 8 }}>
              {trick.map((t) => (
                <div key={`${t.player}-${t.card.code}`}>
                  Seat {t.player}: {t.card.code}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Turn:</strong> seat {turn}
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Tricks won</strong>
              <div>
                {Object.entries(tricksWon).map(([k, v]) => (
                  <div key={k}>
                    Seat {k}: {v}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {finished && (
          <div style={{ marginTop: 12 }}>
            <h5>Game finished</h5>
            <pre>{JSON.stringify(tricksWon, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  },
  // Provide the rules UI directly from the adapter
  rulesComponent: SpadesRules,
};

export default spadesAdapter;
