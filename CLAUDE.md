## Project Overview

Flux is an Input Action System wrapper for Roblox built with roblox-ts. Uses
JECS (ECS) for entity-component architecture. Provides type-safe input handling
with context switching, custom triggers, and network replication.

## Repository Structure

Monorepo using pnpm workspaces. Core package at `packages/core/` - see
`packages/core/CLAUDE.md` for implementation details.

## TypeScript

- TypeScript strict mode always
- Small, pure functions
- No `any` types - ever (use `unknown` if type truly unknown)
- No type assertions without justification
- Prefer options objects over positional parameters
- `readonly` on all data structure properties

## TSDoc Policy

Structure:

1. Summary (one sentence)
2. Detail paragraph (complex logic only)
3. Tags: @param, @returns, @example, @remarks, @throws, @template

Example:

```typescript
/**
 * - Manages boolean toggle state.
 * - @param initialState - Initial value.
 * - @returns Object with `state` and `toggle()` updater.
 */
```

## Core Philosophy

**TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE.** Every single line of production
code must be written in response to a failing test. No exceptions. This is not a
suggestion or a preference - it is the fundamental practice that enables all
other principles in this document.

I follow Test-Driven Development (TDD) with a strong emphasis on behavior-driven
testing and functional programming principles. All work should be done in small,
incremental changes that maintain a working state throughout development.

## Quick Reference

- Write tests first (TDD)
- Test behavior, not implementation
- No `any` types or type assertions
- Immutable data only
- Small, pure functions
- TypeScript strict mode always
- Use real schemas/types in tests, never redefine them

## Development Workflow

**Core principle**: RED-GREEN-REFACTOR in small, known-good increments. TDD is
the fundamental practice.

**Quick reference:**

- RED: Write failing test first (NO production code without failing test)
- GREEN: Write MINIMUM code to pass test
- REFACTOR: Assess improvement opportunities (only refactor if adds value)
- **Wait for commit approval** before every commit
- Each increment leaves codebase in working state
- Capture learnings as they occur, merge at end

For detailed testing patterns and examples, load the `test-driven-development`
skill.

## Testing

**Core principle**: Test behavior, not implementation.

**Quick reference:**

- Write tests first (TDD non-negotiable)
- Test through public API exclusively
- Use factory functions for test data (no `let`/`beforeEach`)
- Tests must document expected behaviors
- No 1:1 mapping between test files and implementation files

Place tests in `<file-name>.spec.ts` files next to the implementation file
Example: `src/shared/modules/foo/bar.ts` → `src/shared/modules/foo/bar.spec.ts`

Pattern:

```typescript
import { describe, expect, it } from "@rbxts/jest-globals";

import { myFunction } from "./bar";

describe(myFunction, () => {
	it("should handle operations", () => {
		expect.assertions(1);

		expect(myFunction()).toBe(10);
	});
});
```

## Resources

- [Roblox-TS](https://roblox-ts.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Kent C. Dodds Testing JavaScript](https://testingjavascript.com/)
- [Functional Programming in TypeScript](https://gcanti.github.io/fp-ts/)
