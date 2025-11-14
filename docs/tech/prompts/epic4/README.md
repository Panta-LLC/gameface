# Epic 4 – Scalable Backend Architecture

Design and implement a scalable backend to support real-time features, APIs, and persistence.

Scope (MVP):

- RESTful APIs for user and session management.
- Redis Pub/Sub for real-time messaging.
- MongoDB for durable storage.

---

## Architecture Overview

```
API Gateway / Backend Service (Node/TS or Go)
  ├─ REST APIs (OpenAPI-based)
  ├─ Redis (Pub/Sub, caching, rate limits)
  └─ MongoDB (primary persistence)

Observability: OpenTelemetry (traces, metrics), structured logs
Security: JWT validation (Kinde), RBAC scopes, rate limiting
```

---

## Non-Functional Targets

- p95 API latency < 150ms under nominal load.
- Zero data loss on normal shutdown; idempotent write endpoints.
- Horizontal scalability via stateless services and managed data stores.

---

## Acceptance Criteria (Aggregate)

- CRUD endpoints for core resources documented and tested.
- Redis Pub/Sub channels defined, secured, and observable.
- MongoDB schemas/indexes created with migration scripts.

---

## Prompts

- backend-apis-implementation-prompt.md
- redis-pubsub-implementation-prompt.md
- mongodb-implementation-prompt.md
