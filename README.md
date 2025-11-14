# 🎮 GameFace — Real-Time Conferencing & Gaming MVP

## Overview

GameFace is a video conferencing app that allows users to join sessions and play interactive games in real time.

### MVP Objective

Build a working demo of a 2-player video chat with a mini-game and matchmaking system.

### Primary Backend Skills

- Event-driven architecture
- Redis Pub/Sub
- WebRTC signaling
- Observability and scaling

## Project Plan

### Video Breakdown

#### Video 1: Introduction and Project Overview

- **Content**: Introduction to GameFace and preview of project phases and components.
- **Script**:
  1. Welcome the audience and introduce GameFace.
  2. Explain the purpose of the project and the problem it solves.
  3. Provide a high-level overview of the project phases:
     - Technical Design
     - Visual Design
     - Implementation
     - Optimization
     - Deployment and Observability.
  4. Conclude with a call to action to follow the series.
- **Task List**:
  - Write the script.
  - Record the introduction video.
  - Edit and publish the video.

#### Video 2: Technical Design Process

- **Content**: Deep dive into the technical design process.
- **Script**:
  1. Explain the importance of technical design in the project lifecycle.
  2. Discuss the backend architecture:
     - Event-driven architecture.
     - Redis Pub/Sub for real-time communication.
     - WebRTC signaling for video chat.
  3. Show diagrams and explain the system components.
  4. Conclude with how this design supports scalability and reliability.
- **Task List**:
  - Create detailed architecture diagrams.
  - Write the technical design script.
  - Record and edit the video.

#### Video 3: Visual Design Process

- **Content**: Walkthrough of the visual design process.
- **Script**:
  1. Discuss the importance of user-centric design.
  2. Showcase wireframes and mockups for the GameFace interface.
  3. Explain the design choices for usability and aesthetics.
  4. Highlight tools and techniques used in the design process.
- **Task List**:
  - Create wireframes and mockups.
  - Write the visual design script.
  - Record and edit the video.

#### Video 4: Implementation and Optimization

- **Content**: Implementation of core features and non-functional optimization.
- **Script**:
  1. Walk through the implementation of matchmaking, video chat, and mini-game integration.
  2. Discuss optimization techniques for performance and scalability.
  3. Highlight challenges faced during implementation and how they were resolved.
  4. Conclude with the importance of optimization in delivering a robust product.
- **Task List**:
  - Plan the implementation steps.
  - Record coding sessions.
  - Edit and publish the video.

#### Video 5: Observability and Deployment

- **Content**: Finalizing the project with observability and deployment.
- **Script**:
  1. Explain the role of observability in maintaining the system.
  2. Showcase tools used for logging, metrics, and monitoring.
  3. Walk through the deployment process and discuss CI/CD pipelines.
  4. Conclude with lessons learned and next steps for GameFace.
- **Task List**:
  - Set up observability tools.
  - Plan the deployment process.
  - Record and edit the video.

### General Tasks

- Set up a YouTube channel or platform for publishing.
- Create a consistent branding style for videos.
- Schedule regular updates to keep the audience engaged.

## Development

This subfolder is a Node.js monorepo managed with npm workspaces.

### Prerequisites

- Node.js 18+ (recommended 20+)
- npm 10+

### Install and bootstrap

```sh
cd gameface
npm run bootstrap
```

This installs all workspace deps and enables Git hooks (Husky).

### Useful scripts

- Run dev servers across apps:
  ```sh
  npm run dev
  ```
- Build everything:
  ```sh
  npm run build
  ```
- Lint, format, and typecheck across all workspaces:
  ```sh
  npm run lint
  npm run format
  npm run typecheck
  ```
- Run tests across workspaces:
  ```sh
  npm test
  ```

### Apps

- API: `apps/api` (Express). Dev: `npm run -w @gameface/api dev`
- Signaling: `apps/signaling` (WebSocket via `ws`). Dev: `npm run -w @gameface/signaling dev`
- Web: `apps/web` (React + Vite). Dev: `npm run -w @gameface/web dev`

### Feature Documentation

Feature docs live in `docs/features/` and use a standard template:

- Index: `docs/features/README.md`
- Template: `docs/features/TEMPLATE.md`
- Current docs:
  - `docs/features/tooling-monorepo.md`
  - `docs/features/commit-pr-hygiene.md`
  - `docs/features/shared.md`
  - `docs/features/api.md`
  - `docs/features/signaling.md`
  - `docs/features/web.md`

## Game Selection Feature

The game selection interface allows users to choose games in real-time. This feature is implemented using WebSocket technology to ensure seamless synchronization across all connected clients. Key highlights include:

- **Real-Time Updates**: Changes made by one user are instantly reflected for all other users.
- **Error Handling**: Robust error handling ensures a smooth user experience even in case of network disruptions.
- **Scalability**: Designed to handle multiple concurrent users efficiently.

For more details, refer to the [feature documentation](docs/features/web.md).

### Packages

- Shared: `packages/shared` (shared utils/types)
- Config: `packages/config` (shared ESLint/TS config)

### Commits & PRs

- Conventional Commits enforced via commitlint.
- Pre-commit runs lint-staged (ESLint + Prettier on changed files).
- Optional guided commits:
  ```sh
  npm run commit
  ```

### Notes on path aliases

TypeScript path alias `@shared/*` is configured for authoring. For runtime/bundling, prefer importing the workspace package `@gameface/shared` once built.
