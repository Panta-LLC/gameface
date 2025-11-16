Card Table adapters

This folder contains adapters for specific card games and the small UI contract used by the card-table host.

Adapter contract (GameAdapter)

- id: string
- players: number — number of seats for the game
- initialState?: (seed?: string) => any — optional game-specific initial state
- GameBoard?: React.ComponentType — component that renders the live game UI
- validateStart?: (state: TableState) => { ok: boolean; reason?: string } — optional validation before starting
- rulesComponent?: React.ComponentType — optional small UI fragment shown on the seating screen with quick rules or guidance

How to add a new adapter

1. Create adapter (e.g. `adapters/myGameAdapter.tsx`) and export a `GameAdapter` object.
2. If you have a simple rules fragment, export a component and set `rulesComponent` on the adapter.
3. Add the adapter to the `GAMES` list in `CardTableHost.tsx` as the `adapter` field for the corresponding `GameDef`.
4. If your game requires custom seat counts or other metadata, set them on the `GameDef.players` field.

Notes

- `SeatingBoard` reads `gameDef.adapter?.rulesComponent` and renders it inside a `<details>` disclosure.
- Prefer exporting the `rulesComponent` from the adapter module rather than assigning it at runtime in the host.
