# Commit & PR Hygiene

## Summary

Ensure consistent commit messages and high-quality pull requests across the Gameface monorepo.

## Conventional Commits

- Enforced by commitlint (`.husky/commit-msg`)
- Example: `feat(api): add health endpoint`
- Use `npm run commit` for guided messages

## Pre-commit

- lint-staged runs ESLint + Prettier on changed files

## Pre-push

- Runs workspace `lint`, `typecheck`, and `test`

## PR Expectations

- Clear summary and scope
- Linked issues
- Updated docs in `docs/features` using `TEMPLATE.md`

## Future Improvements

- Add repository-level PR template and CODEOWNERS at repo root
- Add CI status checks for docs presence
