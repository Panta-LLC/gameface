# Card Table UI Module — Implementation Prompt

Goal

- Build a reusable, modular Card Table UI module for the web app that presents a list of card games (including Spades) and manages the seat/take-seat/start flow. The module should be generic so new card games can be added by implementing a small game adapter.

High-level acceptance criteria

- Users can open the Card Table module and see a list of games (at least: Spades, Hearts, Bridge placeholder, and a Custom entry).
- Selecting a game shows a Seating view with the number of seats required for that game.
- Users (players) can take an available seat; the UI updates immediately for all participants (via signaling or app-level state).
- When the required seats are filled, a prominent "Start game" button appears for the host or the player who initiated the room (or for all players if game rules permit). Clicking it transitions to an in-table game view (gameboard).
- Implementation is modular: the card table core handles seating and lifecycle, while each game provides an adapter implementing game-specific UI and rules (seat count, optional pre-start setup, initial state).
- Good UX, keyboard accessibility, and responsive behavior (mobile-first).

Target audience for the implementation

- A frontend React (TypeScript) engineer or an AI coding assistant tasked with implementing the UI and wiring it into the app's signaling/state layer.

Technical constraints & integration points

- Must use React + TypeScript and match the project's existing CSS convention (component-level CSS).
- Integrate with the existing signaling layer for seat changes and start events (use existing SignalingClient or provide an adapter).
- The module should be suitable for use inside the existing `ActivityHost` activity landing view.

Proposed file structure (suggested)

- src/components/card-table/
  - CardTableHost.tsx // top-level component used by ActivityHost for Card Table activity
  - CardGameSelector.tsx // list of available games + search/filter
  - SeatingBoard.tsx // visual representation of seats, seat buttons
  - GameBoardWrapper.tsx // hosts the selected game's UI after start
  - adapters/
    - spadesAdapter.ts // GameAdapter for Spades (seatCount: 4, ordering, rules)
    - heartsAdapter.ts // placeholder
    - bridgeAdapter.ts // placeholder
  - hooks/
    - useCardTable.ts // encapsulates seating state, signaling, and lifecycle
  - types.ts // GameDef, Seat, TableState, GameAdapter types
  - CardTable.css

Core types (TypeScript)

- type GameId = string;
- type PlayerId = string;
- type Seat = { index: number; playerId: PlayerId | null; displayName?: string };
- type TableStatus = 'lobby' | 'started' | 'finished';
- type TableState = {
  gameId: GameId | null;
  seats: Seat[];
  status: TableStatus;
  hostId?: PlayerId;
  meta?: Record<string, any>;
  };
- interface GameDef {
  id: GameId;
  name: string;
  players: number; // required seat count
  description?: string;
  adapter?: GameAdapter;
  }
- interface GameAdapter {
  id: GameId;
  players: number;
  // initial board state built when the game starts
  initialState?: (seed?: string) => any;
  // Optional: a React component to render the in-game UI (receives game state + events)
  GameBoard?: React.ComponentType<GameBoardProps>;
  // Optional validation before allowing start
  validateStart?: (state: TableState) => { ok: boolean; reason?: string };
  }
- type GameBoardProps = {
  tableState: TableState;
  playerId: PlayerId;
  isHost: boolean;
  signaling: { send: (msg: any) => void };
  };

High-level component contracts

- CardTableHost
  - Props:
    - currentPlayerId: PlayerId
    - signalingClient?: SignalingClientAdapter (optional)
    - initialGameId?: GameId
    - onClose?: () => void
  - Responsibilities:
    - Show `CardGameSelector` when no game selected
    - Show `SeatingBoard` for the selected game
    - Pass events to `useCardTable` hook and to signaling
    - When tableState.status === 'started' render `GameBoardWrapper` with the selected game's adapter
- CardGameSelector
  - Props:
    - games: GameDef[]
    - onSelect(gameId: GameId): void
  - Responsibilities:
    - Render accessible grid/list of games
    - Allow filtering/search
    - Emit selection
- SeatingBoard
  - Props:
    - tableState: TableState
    - currentPlayerId: PlayerId
    - onTakeSeat: (seatIndex: number) => void
    - onLeaveSeat: (seatIndex: number) => void
    - onStartGame: () => void
    - gameDef: GameDef
  - Responsibilities:
    - Render seat visual layout according to seat count
    - Seats should be keyboard-focusable buttons
    - Show who is seated (avatar/name)
    - Disable seat buttons when occupied
    - Show "Start game" when validation passes (or when seats full)
- GameBoardWrapper
  - Props:
    - adapter: GameAdapter
    - tableState
    - playerId
    - signaling
  - Responsibilities:
    - Render adapter.GameBoard if provided, otherwise show a minimal placeholder
    - Provide props and signaling hooks to the game board

State & behavior details

- Local optimistic UI:
  - When a player clicks "Take seat", immediately update local UI to show the seat as claimed (optimistic), but mark it pending.
  - Send a `seat-claim` signaling message to the server. Server will broadcast seat claims; hook reconciles local pending claims with authoritative server state.
- Signaling message shapes
  - seat-claim: { type: 'cardtable.seat.claim', tableId?: string, seatIndex: number, playerId: string, displayName?: string }
  - seat-release: { type: 'cardtable.seat.release', tableId?: string, seatIndex: number, playerId: string }
  - seat-update: authoritative broadcast: { type: 'cardtable.seat.update', tableState: TableState }
  - start-game: { type: 'cardtable.start', tableId?: string, tableState: TableState, seed?: string }
  - Note: adjust message envelope to match your app's signaling conventions.
- Server vs client authority
  - Server should be authoritative for what seats are taken in multi-client scenarios. If you don't have a server authority, use a simple optimistic merge strategy and use last-writer-wins based on a timestamp.

UX flows

1. Landing (Game selector)
   - User sees list of games with descriptions and players required.
   - Click a game → transition to seating view with animation.
2. Seating view
   - Show seats visually arranged (circular or layout appropriate for the game).
   - Empty seats show as "Take seat" buttons; occupied seats show avatar + name and a "Leave" action on hover/focus (if current player is seated or has permissions).
   - When required seats are all occupied:
     - If validateStart passes, show Start button (for host or all players per rules).
     - Otherwise, show disabled Start with reason tooltip.
3. Start
   - Clicking Start sends start-game message; tableState.status transitions to 'started' and `GameBoardWrapper` mounts the game's board.
   - Optionally lock seats to prevent mid-game seat switching.

Edge cases & rules

- Race conditions: two users try to claim the same seat near-simultaneously. Server should accept one claim and reject the other; client must reflect authoritative state and show any conflict to the user.
- Partial disconnects: if user disconnects before start, their seat must be released after a timeout or reconnection window.
- Player rejoin: if a player reconnects, the client should be able to re-request their previous seat if it's still available.
- Host leaving: define host reassignment policy; if host leaves before start, pick next seated player as host or let signaling decide.
- Seat capacity mismatch: game adapter must declare required seat count. Prevent starting unless seat count matches requirements or validateStart returns ok.
- Unauthorized start attempts: only the host (or allowed users) can start if game rules require; UI should disable start accordingly.

Accessibility & keyboard

- Seat buttons: use <button> with aria-label, and role attributes for template (role="button" already).
- Provide a focus-visible style for keyboard navigation (visible ring).
- Ensure content ordering works for screen readers. Provide aria-live region for seat updates (announce seat taken/released).
- Ensure color contrast for seat states and buttons.

Testing guidance

- Unit tests:
  - useCardTable: seat claim/release, merging authoritative state, start-game gating logic.
  - SeatingBoard: renders right number of seat buttons, seat claims toggle disabled state, start button shows only when seats filled (and according to validateStart).
- Integration tests:
  - Simulate two clients claiming seats; assert server broadcast reconciles state.
  - Start game sequence: fill seats → start → GameBoardWrapper mounts with correct initialState.
- Manual QA:
  - Keyboard-only navigation to take seats and start.
  - Mobile layout and rotation behavior.

Implementation notes & modularization pattern

- GameAdapter abstraction:
  - Make it the central extension point for per-game rules and UI.
  - Example: spadesAdapter.ts exports { id: 'spades', players: 4, GameBoard: SpadesBoard, initialState: () => {...}, validateStart: (s) => {...} }.
  - The Card Table core doesn't need to know Spades-specific rules; it delegates to adapter.validateStart for gating start and to adapter.GameBoard for render.
- useCardTable hook responsibilities:
  - Hold local `tableState`, provide `takeSeat`, `leaveSeat`, `attemptStart`, and `subscribe` to signaling updates.
  - Expose optimistic state flags like `pendingSeatClaim: number | null` to allow UI pending indication.
- Styling:
  - Use component CSS files per project conventions and responsive rules.
  - Visual seat layout can be simple for the MVP: a horizontal/row layout for 2–6 players and a circular layout for 4 players (optional).

Example game registry (JSON / in-memory)

- const GAMES: GameDef[] = [
  { id: 'spades', name: 'Spades', players: 4, description: 'Classic trick-taking game', adapter: spadesAdapter },
  { id: 'hearts', name: 'Hearts', players: 4, adapter: heartsAdapter },
  { id: 'bridge', name: 'Bridge (placeholder)', players: 4 },
  { id: 'custom', name: 'Custom', players: 2 }
  ];

Example UI interactions / events

- Player A clicks seat 2:
  - UI: Seat 2 shows pending state (outline, spinner).
  - Client sends { type: 'cardtable.seat.claim', seatIndex: 2, playerId: 'A' }.
  - Server broadcasts updated table state or approved seat claim.
  - Clients update seats and pending marker clears.
- When seats full:
  - UI shows "Start game" button.
  - Clicking start sends { type: 'cardtable.start', tableState, seed }.
  - Server acknowledges, broadcasts start; clients render the game's GameBoard with initialState.

Deliverables and small milestones

1. Implement components + styles and a `useCardTable` hook, with in-memory signaling adapter (for local dev).
2. Implement `spadesAdapter` with a minimal GameBoard placeholder and initialState builder.
3. Add unit tests for `useCardTable` and `SeatingBoard`.
4. Integrate CardTableHost into `ActivityHost` as the "Card Table" activity.

Optional: Example pseudo-code skeleton (very short)

- useCardTable.ts (pseudo)
  - const [tableState, setTableState] = useState<TableState>({gameId:null,seats:[]...});
  - const takeSeat = (index) => { setPending(index); signaling.send(seat-claim...) }
  - effect: subscribe signaling -> update tableState
  - const attemptStart = () => { if(adapter.validateStart(tableState)) signaling.send(start-game...) }

- SeatingBoard.tsx (pseudo)
  - render seats.map((s,i)=> <button disabled={!!s.playerId} onClick={() => takeSeat(i)}>{s.playerId ? name : 'Take seat'}</button>)
  - show Start button when seats full and validateStart ok.

Notes on scope and next steps

- I can implement the module for you next (components + CSS + hook + basic Spades adapter + tests) if you want. Implementation would include:
  - creating the files above,
  - wiring to the app's signaling (or using a mock adapter for dev),
  - and adding basic tests for seat flow and start logic.
- Let me know whether to:
  - implement the module now in the repo, or
  - produce a runnable code sample in a separate branch,
  - or expand the prompt with more detailed UI mockups and Figma-like specs.

Would you like me to generate the code scaffolding now? If yes, I will:

- create the component files, CSS, basic spades adapter, and the hook,
- include unit tests for `useCardTable` and `SeatingBoard`,
- and run an automatic type/lint check on the created files.
