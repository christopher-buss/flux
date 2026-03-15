## Project Overview

Flux is an Input Action System wrapper for Roblox built with roblox-ts. Uses
JECS (ECS) for entity-component architecture. Provides type-safe input handling
with context switching, custom triggers, and network replication.

## Repository Structure

Monorepo using pnpm workspaces. Core package at `packages/core/` - see
`packages/core/CLAUDE.md` for implementation details.

## Feature Planning

### Tracer Bullets

When building features, build a tiny, end-to-end slice of the feature first,
seek feedback, then expand out from there.

Tracer bullets comes from the Pragmatic Programmer. When building systems, you
want to write code that gets you feedback as quickly as possible. Tracer bullets
are small slices of functionality that go through all layers of the system,
allowing you to test and validate your approach early. This helps in identifying
potential issues and ensures that the overall architecture is sound before
investing significant time in development.

## Resources

- [Roblox-TS](https://roblox-ts.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Kent C. Dodds Testing JavaScript](https://testingjavascript.com/)
- [Functional Programming in TypeScript](https://gcanti.github.io/fp-ts/)
- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)t