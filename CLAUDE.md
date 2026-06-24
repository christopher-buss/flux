## Project Overview

Flux is an Input Action System wrapper for Roblox built with roblox-ts. Uses
JECS (ECS) for entity-component architecture. Provides type-safe input handling
with context switching, custom triggers, and network replication.

## Repository Structure

Monorepo using pnpm workspaces.

- `packages/core` (`@rbxts/flux`) - Engine. ECS-agnostic input system; contexts,
  triggers, modifiers, replication via opaque `InputHandle`s.
- `packages/jecs` (`@rbxts/flux-jecs`) - JECS wrapper. Maps ECS entities ↔ core
  handles.
- `packages/react` (`@rbxts/flux-react`) - React wrapper. Hooks (`useAction`,
  `useBindings`) + `FluxProvider`.
- `packages/test-utils` (`@flux/test-utils`) - Test helpers. Shared
  testing-library bindings and fixtures (private).

## Maintaining CLAUDE.md

Root stays a **map**, not a manual. Package-specific rules live in that
package's `CLAUDE.md`; full guidance in `docs/agents/maintaining-claude-md.md`.
Don't write an unproven trap here on sight — **stage it** in `docs/memory/` and
let frequency prove it (`docs/agents/memory-protocol.md`).

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`christopher-buss/flux`) via the `gh` CLI;
external PRs are also a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See
`docs/agents/domain.md`.

## Resources

- [Roblox-TS](https://roblox-ts.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Kent C. Dodds Testing JavaScript](https://testingjavascript.com/)
- [Functional Programming in TypeScript](https://gcanti.github.io/fp-ts/)
- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [Jecs](https://github.com/Ukendio/jecs)
