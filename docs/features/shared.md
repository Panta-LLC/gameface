# Shared Package (@gameface/shared)

## Summary
Reusable utilities and types shared across Gameface apps.

## Current Surface
- `greet(name: string): string` – sample util with unit test

## Design Notes
- TypeScript-first, strict mode
- Build emits CJS/ESM-compatible JS + d.ts to `dist/`
- Exposed via workspace package `@gameface/shared`

## Usage
```ts
import { greet } from '@gameface/shared';
console.log(greet('Player')); // "Hello, Player!"
```

## Testing
- Vitest unit tests under `src/*.test.ts`
- Run: `npm run -w @gameface/shared test`

## Future Improvements
- Common DTOs for API/Signaling messages
- Utility for standardized logging and metrics
