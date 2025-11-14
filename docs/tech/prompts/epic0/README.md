# Epic 0 – Initial Application Setup

Lay the groundwork for a productive, consistent developer experience and a stable local runtime.

Scope (MVP):
- Repository bootstrap (tooling, conventions, structure).
- Environment and configuration management.
- Project scaffolding for frontend, backend, signaling, and shared types.

---
## Architecture Overview
- Monorepo/workspace layout with shared packages.
- TypeScript across services; unified linting/formatting.
- Local runtime via Docker Compose for infra (Mongo, Redis) and apps.

---
## Acceptance Criteria (Aggregate)
- New dev can clone → bootstrap → run local stack end-to-end in < 15 minutes.
- Lint/format/typecheck scripts work uniformly; pre-commit hooks active.
- `.env.example` present; config validated at startup; secrets not in repo.

---
## Prompts
- repo-bootstrap-implementation-prompt.md
- environment-config-implementation-prompt.md
- project-scaffolding-implementation-prompt.md
