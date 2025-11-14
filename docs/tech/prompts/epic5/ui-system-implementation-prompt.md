# Implementation Prompt – UI System & Components

## Context
Create a cohesive design system and reusable components enabling fast UI development and consistency.

## Objectives
- Design tokens (colors, spacing, radius, shadows, typography) with dark-first theme.
- Core components: Button, Input, Select, Modal/Drawer, Tooltip, Toast, Tabs, Avatar, Badge, Card.
- Accessibility: focus states, ARIA roles, keyboard navigation.

## Technical Notes
- Prefer CSS variables for theming; utility classes or CSS-in-JS per stack.
- Build storybook for components with controls.
- Visual regression tests for critical components.

## Acceptance Criteria
- Tokens available app-wide; theme switch supported (dark default).
- Components documented with examples; pass a11y checks.

## Test Plan
- Storybook a11y and interactions; unit tests for component logic.
- Snapshot tests for visual regressions (critical set).
