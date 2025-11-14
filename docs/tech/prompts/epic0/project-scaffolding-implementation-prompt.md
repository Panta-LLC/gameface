# Implementation Prompt – Project Scaffolding (Apps & Local Runtime)

## Context

Stand up minimal runnable apps and a local runtime so the team can iterate quickly.

## Objectives

- Frontend app scaffold (e.g., Next.js/Vite + TS) with basic routing and auth placeholder.
- Backend API scaffold (Node/Express/Nest + TS) with health and version endpoints.
- Signaling service scaffold (WebSocket) with simple echo/room join placeholder.
- Shared types/utilities package consumed by all apps.
- Dockerfiles for each app; docker-compose for local Mongo + Redis + apps.

## Endpoints & Health

- `/healthz` returns status, build version, git sha.
- `/readyz` for readiness checks; simple dependencies ping.
- WS: `/ws` accepts auth token (fake in local) and allows join/leave room.

## Local Dev DX

- Hot reload for all apps; per-app dev servers.
- Single `compose up` path brings infra and apps online.
- Makefile or root scripts to streamline bootstrap, build, dev.

## Acceptance Criteria

- Fresh clone → bootstrap → run local: frontend at localhost, API and signaling reachable, Mongo/Redis up.
- Health endpoints return OK; logs structured; basic metrics enabled (optional).
- Shared types imported in API and web; builds succeed.

## Test Plan

- Manual smoke: open web → call API health; connect WS echo.
- Add a simple integration test using docker-compose in CI (optional baseline).
- Verify compose down cleans state; volumes managed.
