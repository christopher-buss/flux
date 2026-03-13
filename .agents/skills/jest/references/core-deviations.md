---
name: Jest Roblox Deviations
description: |
    Critical differences between Jest Roblox (Luau) and JavaScript Jest.
    Must-read before writing any jest-roblox tests.
---

# Jest Roblox Deviations from JS Jest

Quick reference of every difference that matters when writing tests.

## Negation: `.never` not `.not`

`not` is a reserved keyword in Lua. Use `.never` everywhere:

```ts
expect(value).never.toBe(0);
expect(array).never.toContain("x");
```

Asymmetric aliases exist: `expect.never.arrayContaining()`,
`expect.never.objectContaining()`, `expect.never.stringContaining()`,
`expect.never.stringMatching()`.

## Truthiness

In Lua, only `false` and `nil` are falsy. `0`, `""`, and `{}` are **truthy**.

```ts
expect(0).toBeTruthy(); // passes (unlike JS)
expect("").toBeTruthy(); // passes (unlike JS)
expect(false).toBeFalsy(); // passes
expect(nil).toBeFalsy(); // passes
```

## Nil Checking

Use `.toBeUndefined()` and `.never.toBeUndefined()`.

## `jest.fn()` Returns Two Values

```ts
const [mock, mockFunc] = jest.fn();
```

- `mock` — callable table (use for assertions with `expect`)
- `mockFunc` — real function (pass to code that requires
  `type(x) == "function"`)

If the tested code accepts callable tables, you only need the first value:

```ts
const [mock] = jest.fn();
mock("hello");
expect(mock).toHaveBeenCalledWith("hello");
```

## Explicit Imports Required

Nothing is auto-global. Always import from `@rbxts/jest-globals`:

```ts
import { describe, expect, it, jest } from "@rbxts/jest-globals";
```

## `.each` Syntax

No tagged templates in Lua. Two forms:

```ts
// Array of arrays (positional args)
it.each([
	[1, 1, 2],
	[1, 2, 3],
])("should add(%i, %i) = %i", (a, b, expected) => {
	expect.assertions(1);

	expect(a + b).toBe(expected);
});

// Named fields (string header)
it.each([
	{ a: 1, b: 1, expected: 2 },
	{ a: 1, b: 2, expected: 3 },
])("should compute $a + $b = $expected", ({ a, b, expected }) => {
	expect.assertions(1);

	expect(a + b).toBe(expected);
});
```

## `expect.any()` Accepts Strings or Prototypes

Lua has no constructors for primitives. Pass typename strings:

```ts
expect.any("number");
expect.any("string");
expect.any("boolean");
expect.any("table");
```

Or pass a prototype table for class checking via `instanceof`.

## `expect.nothing()`

Matches only `nil`. Use inside `toMatchObject` to assert a key is absent:

```ts
expect({ foo: "bar" }).toMatchObject({
	baz: expect.nothing(),
	foo: "bar",
});
```

## `expect.callable()`

Matches anything that can be called (functions, callable tables, callable
userdata). Prefer over `expect.any("function")` for callback assertions.

## `.toMatch()` and `expect.stringMatching()`

Accept Lua string patterns (not JS regex) or `RegExp` from RegExp polyfill.

## `.toHaveLength()`

Uses the `#` operator. Returns 0 for key-value tables. Checks `.length` property
if it exists. Cannot check function argument count.

## `.toStrictEqual()`

Performs `toEqual` plus metatable type checking. Does **not** check for array
sparseness or `undefined` values like JS Jest.

## `.toThrow()`

Accepts strings, `RegExp`, `Error` objects, or `Error` classes from
LuauPolyfill.

## `mockFn.new()`

Replaces JS `new mockFn()`:

```ts
const [mockFunc] = jest.fn();
const instance = mockFunc.new();
```

## Custom Matchers

Access `this.isNever`, `this.equals(a, b)`, and `this.utils` for formatting.

```ts
expect.extend({
	toBeWithinRange(received: number, floor: number, ceiling: number) {
		const shouldPass = received >= floor && received <= ceiling;
		const range = this.utils.printExpected(`${floor} - ${ceiling}`);
		const value = this.utils.printReceived(received);
		const message = shouldPass
			? () => `expected ${value} not to be within range ${range}`
			: () => `expected ${value} to be within range ${range}`;

		return { message, pass: shouldPass };
	},
});
```

## Fake Timers

Mocks Lua/Roblox-specific timers: `DateTime`, `task.delay`, `task.cancel`,
`task.wait`, `os.time`, `os.clock`.

Roblox-only: `jest.setEngineFrameTime(ms)` simulates frame-based timer
processing.

## Configuration

- Config file is `jest.config.ts` (returns a table)
- `projects` takes an array of Instances (not filesystem paths)
- Test filtering uses `testMatch` glob patterns or `testPathPattern` regex

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/Deviations.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/ExpectAPI.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/JestObjectAPI.md
-->
