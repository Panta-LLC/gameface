# Tooling & Monorepo

## Summary
The Gameface folder is a Node.js monorepo using npm workspaces with shared TypeScript, ESLint (flat config), Prettier, and Husky hooks.

## Architecture/Design
- Workspaces: `apps/*`, `packages/*`
- Shared TS base config: `tsconfig.base.json` with `@shared/*` authoring alias
- ESLint v9 flat config: `eslint.config.js` (TypeScript, import sort, unused imports)
- Pre-commit via Husky + lint-staged; commitlint for Conventional Commits

## Scripts (root)
- `npm run bootstrap` – install deps, set up hooks
- `npm run dev` – run api, signaling, web concurrently
- `npm run build|test|lint|format|typecheck` – run across workspaces
- `npm run commit` – commitizen conventional commit helper

## Dependencies
- Key dev deps: `typescript`, `typescript-eslint`, `eslint`, `prettier`, `husky`, `lint-staged`, `@commitlint/*`, `concurrently`

## Usage
```sh
cd gameface
npm run bootstrap
npm run dev
```

## Future Improvements
- Add CI workflows (build, lint, test) and release automation
- Optional Turborepo for task orchestration
