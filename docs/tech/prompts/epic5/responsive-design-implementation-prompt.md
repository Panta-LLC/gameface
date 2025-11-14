# Implementation Prompt – Responsive Design

## Context

Ensure the app adapts beautifully from mobile to desktop with priority on call and mini‑game experiences.

## Objectives

- Mobile-first layouts; scale up to tablet/desktop.
- Grid system + fluid typography; container queries where supported.
- Breakpoints tuned to real devices; respect safe areas (notches).

## Layout

- App shell: header/sidebar collapsible, stage area, overlay panel.
- Flexible video grid (1:1 now, extensible); maintain aspect ratio.
- Game overlay layered above video with adaptive sizing.

## Techniques

- CSS variables for spacing/type; clamp() for fluid sizes.
- Use prefers-reduced-motion; reduce animations accordingly.
- Touch targets ≥ 44px; keyboard navigation parity.

## Acceptance Criteria

- Lobby, Call, and Game screens render without horizontal scroll at all breakpoints.
- Controls remain accessible and legible on iPhone SE → large desktops.
- Visual regressions covered with snapshots at 3 representative widths.

## Test Plan

- Storybook viewport tests at sm/md/lg; Percy/Chromatic snapshots.
- Manual device run-through: iOS Safari, Android Chrome, macOS Chrome/Safari.
