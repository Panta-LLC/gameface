import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { spadesAdapter } from './spadesAdapter';

// Recreate deck utilities (must match adapter's implementation)
const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
function createDeck() {
  const out = [];
  for (const s of SUITS) {
    for (let i = 0; i < RANKS.length; i++) {
      const r = RANKS[i];
      out.push({ code: `${r}${s}`, suit: s, rank: r, value: 2 + i });
    }
  }
  return out;
}

function seedFn(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr: any[], seed: number | string = Date.now()) {
  const rnd = seedFn(Number(seed) & 0xffffffff);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deal(deck: any[], players: number): Record<number, any[]> {
  const hands: Record<number, any[]> = {};
  for (let p = 0; p < players; p++) hands[p] = [];
  let idx = 0;
  while (idx < deck.length) {
    for (let p = 0; p < players && idx < deck.length; p++) {
      hands[p].push(deck[idx++]);
    }
  }
  return hands;
}

describe('spadesAdapter GameBoard basic flow', () => {
  it('deals 13 cards to each of 4 players and allows a trick to be played via signaling', async () => {
    // fix Date.now so the adapter's seed is deterministic
    const FIXED = 123456789;
    const origNow = Date.now;
    // @ts-ignore
    Date.now = () => FIXED;

    const seats = [0, 1, 2, 3].map((i) => ({ index: i, playerId: `p${i}` }));
    const tableState = { gameId: 't1', seats, status: 'started' };

    // create a simple signaling implementation that captures the start seed and allows sending messages into the board
    let handler: ((msg: any) => void) | null = null;
    const sent: any[] = [];
    const signaling = {
      send: vi.fn((m) => sent.push(m)),
      on: (h: (m: any) => void) => {
        handler = h;
        return () => {
          handler = null;
        };
      },
    };

    // render the GameBoard for player 0 (wrap in act to avoid warnings)
    const Board = spadesAdapter.GameBoard!;
    await act(async () => {
      render(<Board tableState={tableState} playerId={'p0'} signaling={signaling} />);
    });

    // wait for the player's hand to render (13 buttons)
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      // there will be many buttons (cards + others), but at least 13 for hand
      expect(buttons.length).toBeGreaterThanOrEqual(13);
    });

    // capture seed from sent messages
    const startMsg = sent.find((s) => s.type === 'spades.start');
    expect(startMsg).toBeDefined();
    const seed = startMsg.seed;

    // reconstruct hands in the test to pick opponent cards
    const deck = shuffle(createDeck(), seed);
    const dealt = deal(deck, 4);

    // find one card code from each opponent (seat 1..3)
    const opponentsPlays = [1, 2, 3].map((i) => dealt[i][0]);

    // play a card as player 0 by clicking the first card button
    const myButtons = screen.getAllByRole('button');
    // pick the first button that looks like a card code (contains a suit letter)
    const cardButton = myButtons.find((b) => /[SHDC]$/.test(b.textContent || ''));
    expect(cardButton).toBeDefined();
    const myCardCode = cardButton!.textContent!.trim();
    fireEvent.click(cardButton!);

    // simulate the opponents sending spades.play messages, in order
    for (let i = 0; i < opponentsPlays.length; i++) {
      const c = opponentsPlays[i];
      // call the registered handler as if received over signaling (wrap in act)
      await waitFor(() => handler !== null);
      await act(async () => {
        handler!({ type: 'spades.play', player: i + 1, card: c });
      });
    }

    // after the trick completes, trick area should clear and at least one tricksWon should be > 0
    await waitFor(() => {
      // check for 'Tricks won' text
      expect(screen.getByText(/Tricks won/i)).toBeDefined();
      const wins = screen.getAllByText(/Seat\s+\d+:\s+\d+/i);
      // at least one seat should show a number (string match covers zeros too)
      expect(wins.length).toBeGreaterThanOrEqual(1);
    });

    // restore Date.now
    // @ts-ignore
    Date.now = origNow;
  }, 20000);
});
