# API Service (@gameface/api)

## Summary

Express-based HTTP API. Currently provides a health endpoint for uptime checks.

## Endpoints

- `GET /health` → `{ ok: true }`

## Configuration

- `PORT` (optional, default `3000`)

## Error Handling

- Health endpoint returns 200 with a simple payload; future endpoints should standardize errors as `{ error: { code, message } }`.

## Security

- None for health. Future endpoints should apply auth (e.g., JWT) and input validation (zod/validator).

## Observability

- Console logging stubbed; future: structured logs and request metrics.

## Dev & Build

```sh
npm run -w @gameface/api dev   # tsx watch
npm run -w @gameface/api build # tsc build to dist
npm run -w @gameface/api start # run built server
```

## Future Improvements

- Versioned API routes
- Auth middleware and request validation
- OpenAPI definition + docs
