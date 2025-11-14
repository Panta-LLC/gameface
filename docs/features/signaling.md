# Signaling Service (@gameface/signaling)

## Summary

WebSocket-based signaling layer (using `ws`) for peer discovery and WebRTC session negotiation. Currently echoes messages for connectivity testing.

## Protocol

- On connection: server sends `{ type: 'hello', payload: 'Welcome to Gameface signaling' }`
- Echo: any message received is sent back unchanged (RawData)

## Configuration

- `PORT` (optional, default `3001`)

## Error Handling

- Client disconnects are tolerated; no state is tracked yet

## Security

- No auth in MVP; future: auth token validation and rate limiting

## Observability

- Console logs on startup; future: connection counts, message metrics

## Dev & Build

```sh
npm run -w @gameface/signaling dev
npm run -w @gameface/signaling build
npm run -w @gameface/signaling start
```

## Future Improvements

- Define message schema (join/offer/answer/ice)
- Room management and matchmaking
- Resilient reconnection and backpressure handling
