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

## Game Selection

### Overview

The game selection feature enables users to select games in real-time. This functionality is powered by WebSocket integration, ensuring that updates are synchronized across all connected clients.

### Implementation

- **Frontend**: The game selection interface is built using React and is part of the `GameSelection.tsx` component.
- **Backend**: A WebSocket server handles real-time communication, ensuring low-latency updates.

### Key Features

- **Real-Time Synchronization**: Updates are broadcast to all clients instantly.
- **Error Handling**: Includes mechanisms to handle network disruptions gracefully.
- **Scalability**: Optimized for multiple concurrent users.

### Future Enhancements

- Improved UI/UX for game selection.
- Enhanced scalability for larger user bases.
