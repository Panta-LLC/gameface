# Epic 5 – User Flow Implementation Prompt (Lobby ➜ Room ➜ Activity)

This prompt specifies the end-to-end flow the web client must implement now:

1. User logs in and is prompted to create or join a room.
2. After joining, the user sees other members via video (local pinned bottom-left, remotes across the top).
3. Users can expand/collapse a sidebar to pick an activity (game/tool).
4. Selecting an activity loads its UI onto the stage for everyone in the room.

Use this document as the contract for implementation, test planning, and review.

---

## Context

- Monorepo: `apps/web` (frontend), `apps/signaling` (WebSocket signaling), optional `apps/api`.
- Current video layout:
  - Local video pinned at bottom-left of the stage.
  - Remote videos arranged evenly across the top strip.
- Rooms are managed in signaling in-memory maps.

---

## Goals

- Deliver a simple, reliable end-to-end flow that multiple users can demo in two browser tabs.
- Keep network/API minimal: reuse the existing signaling server for room membership and activity broadcast.
- Keep UX responsive and accessible; graceful handling of media permissions and connection loss.

## Non‑Goals (for this prompt)

- Account management or persistent auth. Use a stubbed “Login/Enter Name” step.
- Persistence of rooms or activities across restarts.
- Production-ready design system; use existing styles where possible.

---

## Architecture and UI Structure

- App Shell (web)
  - AuthGate (stub): captures display name and grants camera/mic permissions.
  - RoomGate: create/join room by id.
  - StageLayout: main surface containing
    - RemoteStrip (top) – grid of remote videos.
    - ActivityStage (center) – where the selected activity UI mounts.
    - LocalPin (bottom-left) – the local self-view tile.
    - Sidebar (right) – collapsible; contains ActivityPicker.

- Signaling contracts
  - `join { room }` – join a room.
  - `peer-joined { id }` / `peer-left { id }` – presence (already available).
  - `select-activity { activity: string }` – user selects an activity.
  - `activity-selected { activity: string }` – broadcast selection to the room.

> Note: You can alias `select-activity` to the existing `select-game` on the server or add a new type. Consistency with the UI copy (“Activity”) is preferred.

---

## Implementation Plan (Step-by-step)

1. Auth + Permissions (Frontend)
   - Create `AuthGate` component (lightweight):
     - Input for display name.
     - Button: “Continue”.
     - On continue, request `getUserMedia({ video: true, audio: true })`.
     - Persist the stream for later use by VideoCall.
   - Acceptance: When denied, show dismissible error and allow retry.

2. Room Join (Frontend)
   - Reuse `RoomGate` to choose a room id.
   - After joining, mount `VideoCall` with the chosen room and attach the saved local stream.
   - Show presence state (connecting/connected) near controls.

3. Video Layout (Frontend)
   - Keep implemented layout: remote strip across the top, local pinned bottom-left.
   - Ensure multi-peer rendering (add/remove tiles on `peer-joined`/`peer-left`).

4. Sidebar + Activity Picker (Frontend)
   - Add `ActivitySidebar` with expand/collapse toggle (keyboard accessible):
     - Displays a list of activities (start with 2–3, e.g., `card-table`, `trivia`, `whiteboard`).
     - On click, send `select-activity` via signaling.
   - When a selection message is received, set `currentActivity` in shared UI state.

5. Activity Stage (Frontend)
   - Add `ActivityHost` component that renders the currently selected activity UI:
     - Placeholder UIs are acceptable initially (e.g., a box labeled “Card Table” with basic layout matching the screenshot tone).
     - Contract: `ActivityHost` takes `{ activity: string | null }`.
   - When `currentActivity` is null, show a friendly empty state.

6. Signaling (Server)
   - Add handlers:
     - `select-activity` – validate presence of `room` and `activity`, then `broadcastToRoom(room, { type: 'activity-selected', activity })`.
   - Optionally deprecate or alias any earlier `select-game` messages.

---

## Contracts & State (Mini‑Spec)

- UI State Machine (frontend)
  - `unauthenticated` → `perm-check` → `room-gate` → `in-room`.
  - `in-room` has substate `{ sidebar: open|closed, activity: string|null }`.

- Activity IDs (strings)
  - Must be URL-safe; examples: `card-table`, `trivia`, `whiteboard`.

- Error Modes
  - Media permission denied, signaling disconnected, unknown message type.
  - Each shows a lightweight banner or inline message; retry path available.

---

## Acceptance Criteria

- A user can:
  1. Enter a name, grant camera/microphone access, and land on RoomGate.
  2. Join a room; local self-view appears bottom-left, remote peers line up across the top.
  3. Toggle the sidebar (button and keyboard shortcut) and pick an activity.
  4. The selection propagates to all connected clients; `ActivityHost` renders the chosen UI for everyone.
- Tab-to-order is logical; all interactive controls are label-associated.
- Works with 2+ tabs in the same browser on localhost using fake devices.

---

## Test Plan

- Manual multi-tab test (2 tabs):
  - Tab A & B: Complete AuthGate and join the same room.
  - Verify both see each other’s video; local pin + remote strip layouts stable on resize.
  - Toggle sidebar open/closed with mouse and keyboard (e.g., `Ctrl+\`` suggestion).
  - Pick each activity in Tab A; Tab B updates within 500ms.
- Unit/Integration:
  - Sidebar component toggles state and emits selection.
  - ActivityHost renders correct UI for given `activity` prop.
  - Signaling client dispatches/handles `activity-selected` messages.

---

## Implementation Hints

- Share a single signaling client through React Context to avoid multiple sockets.
- Use CSS grid/flex for the sidebar + stage split; keep min-width for the sidebar so tiles don’t jitter.
- Debounce rapid activity clicks (e.g., 250ms) to avoid message storms.
- Store the last selected activity in memory; no persistence required.

---

## Follow-ups (Out of Scope Here)

- Real authentication and user identity.
- Server-side room membership roster and avatars.
- Activity-specific synchronization beyond initial selection.
- Recording and moderation controls.

---

## Definition of Done

- The 4-step flow works end-to-end across two tabs.
- Code is typed, linted, and includes minimal unit tests for sidebar and ActivityHost.
- Prompt kept in sync with the implementation; deviations documented inline.
