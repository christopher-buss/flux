---
name: Test Structure
description: |
    Writing and organizing tests with describe, test/it, factory functions,
    .each, .only, .skip, and .todo.
---

# Test Structure

## Imports

All globals must be explicitly imported:

```ts
import { describe, expect, it, jest } from "@rbxts/jest-globals";
```

## `describe` and `test`

```ts
describe("math operations", () => {
	it("should add numbers", () => {
		expect.assertions(1);

		expect(1 + 2).toBe(3);
	});

	it("should subtract numbers", () => {
		expect.assertions(1);

		expect(5 - 3).toBe(2);
	});
});
```

## Test Setup — Prefer Factory Functions

Avoid `beforeEach`/`afterEach` hooks. Use factory functions instead.

**Why:**

- Each test explicitly shows its setup — no hidden state from hooks
- Tests stay independent; no shared mutable state between them
- Easy to customize per-test without conditional hook logic
- Easier to read top-to-bottom without jumping to hook definitions

```ts
function createPlayer(overrides?: Partial<PlayerData>): PlayerData {
	return {
		name: "TestPlayer",
		health: 100,
		inventory: [],
		...overrides,
	};
}

describe("player combat", () => {
	it("should reduce health on damage", () => {
		expect.assertions(1);

		const player = createPlayer({ health: 50 });

		expect(applyDamage(player, 10).health).toBe(40);
	});

	it("should not go below zero", () => {
		expect.assertions(1);

		const player = createPlayer({ health: 5 });

		expect(applyDamage(player, 20).health).toBe(0);
	});
});
```

When multiple values need coordinated setup, return them from a single factory:

```ts
function createBattle(): { attacker: PlayerData; defender: PlayerData } {
	const attacker = createPlayer({ name: "Attacker", health: 100 });
	const defender = createPlayer({ name: "Defender", health: 80 });
	return { attacker, defender };
}

it("should apply damage to defender", () => {
	expect.assertions(1);

	const { attacker, defender } = createBattle();

	expect(resolveCombat(attacker, defender).defender.health).toBeLessThan(80);
});
```

## `.only` and `.skip`

Focus or skip tests **within a single file**:

```ts
it.only("should run this test", () => {
	expect.assertions(1);

	expect(true).toBeTruthy();
});

it.skip("should be explicitly skipped", () => {
	expect.assertions(1);

	expect(true).toBeFalsy();
});
```

Works on `describe` too: `describe.only()`, `describe.skip()`.

## `.todo`

Placeholder for tests you plan to write:

```ts
it.todo("should handle edge case");
```

Shows in summary output. Must **not** have a callback function.

## `.failing`

Mark tests expected to fail (useful for BDD or contributing known-failing
tests):

```ts
it.failing("should be a known bug", () => {
	expect.assertions(1);

	expect(5).toBe(6);
});
```

Supports `.only.failing` and `.skip.failing`.

## `.each` — Data-Driven Tests

### Array of arrays (positional args)

```ts
it.each([
	[1, 1, 2],
	[1, 2, 3],
	[2, 1, 3],
])("should add(%i, %i) = %i", (a, b, expected) => {
	expect.assertions(1);

	expect(a + b).toBe(expected);
});
```

### Table of named tables

roblox-ts doesn't support tagged template literals, so we use a string header to
name fields:

```ts
it.each([
	{ a: 1, b: 1, expected: 2 },
	{ a: 1, b: 2, expected: 3 },
])("should compute $a + $b = $expected", ({ a, b, expected }) => {
	expect.assertions(1);

	expect(a + b).toBe(expected);
});
```

`.each` works on `it`, `it.only`, `it.skip`, `describe`, `describe.only`, and
`describe.skip`.

## Timeout

All test/hook functions accept a final `timeout` parameter (ms):

```ts
it("should be a slow operation", () => {
	expect.assertions(1);

	// long running test
}, 10000); // 10 second timeout
```

Default timeout is 5000ms. Configure globally via `testTimeout` in
`jest.config.ts`.

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/GlobalAPI.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/SetupAndTeardown.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/TestFiltering.md
-->
