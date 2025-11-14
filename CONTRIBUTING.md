# Contributing to Gameface

Thanks for helping make Gameface better!

## Getting started

1. Use Node 18+ and npm 10+.
2. From `gameface/`, install dependencies:
   ```sh
   npm run bootstrap
   ```
3. Pick an app or package and run dev/build/test as needed (see README).

## Commit messages

We use Conventional Commits. Examples:

- feat(api): add health endpoint
- fix(signaling): handle client disconnects gracefully
- docs(web): update quickstart

You can use a guided prompt:

```sh
npm run commit
```

Commits are linted by commitlint via a Husky `commit-msg` hook.

## Pre-commit checks

Staged files run through ESLint + Prettier (lint-staged). Fix issues locally:

```sh
npm run lint
npm run format
```

## Pull requests

- Keep PRs focused and small when possible.
- Ensure `npm run build`, `npm run typecheck`, and `npm test` pass.
- Link issues and describe changes clearly.
