# Web App (@gameface/web)

## Summary
React + Vite frontend. MVP renders a simple landing view; to be expanded with login, lobby, and in-call UI.

## Structure
- Entry: `src/main.tsx`, `src/App.tsx`
- Build: Vite outputs to `dist/`

## Dev & Build
```sh
npm run -w @gameface/web dev
npm run -w @gameface/web build
npm run -w @gameface/web preview
```

## Error Handling
- UI should render fallback states for network issues; TBD with actual features

## Security
- No auth in MVP; integrate with API when available

## Observability
- TODO: lightweight client metrics + error boundaries

## Future Improvements
- Component library and design tokens
- State management for lobby/gameplay
- WebRTC integration with signaling
