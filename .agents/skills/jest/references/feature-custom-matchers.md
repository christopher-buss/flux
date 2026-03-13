---
name: Custom Matchers
description: Extending Jest Roblox with custom matchers via expect.extend().
---

# Custom Matchers

## Import

```ts
import { expect } from "@rbxts/jest-globals";
```

## `expect.extend(matchers)`

Declare the matcher type, then register the implementation:

```ts
declare module "@rbxts/jest-globals" {
	namespace jest {
		interface Expect {
			toBeWithinRange(floor: number, ceiling: number): unknown;
		}

		interface InverseAsymmetricMatchers {
			toBeWithinRange(floor: number, ceiling: number): unknown;
		}

		// eslint-disable-next-line ts/no-empty-object-type -- Matches upstream types
		interface Matchers<R, T = {}> {
			toBeWithinRange(floor: number, ceiling: number): R;
		}
	}
}

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

## The `this` Context (Lua Deviation)

In Luau, the first argument is `self` — the matcher context. In roblox-ts,
`this` is bound automatically. Omit it from the parameter list:

```ts
expect.extend({
	toBeEven(received: number) {
		return {
			message: () => `expected ${received} to be even`,
			pass: received % 2 === 0,
		};
	},
});
```

## Matcher Context Properties

Available on `this`:

| Property            | Description                                  |
| ------------------- | -------------------------------------------- |
| `this.isNever`      | `true` if called with `.never`               |
| `this.equals(a, b)` | Deep equality check                          |
| `this.utils`        | Formatting utilities from jest-matcher-utils |

### Formatting with `this.utils`

```ts
expect.extend({
	toBeFoo(received: string) {
		const shouldPass = received === "foo";
		return {
			message: () => {
				return (
					`${this.utils.matcherHint("toBeFoo")}\n\n` +
					`Expected: ${this.utils.printExpected("foo")}\n` +
					`Received: ${this.utils.printReceived(received)}`
				);
			},
			pass: shouldPass,
		};
	},
});
```

## Return Value

Matchers must return `{ pass, message }`:

- `pass` — boolean indicating match
- `message` — function returning error string
    - When `pass = true`: message for `.never` failure case
    - When `pass = false`: message for normal failure case

## Using Custom Matchers

```ts
it("should be in range", () => {
	expect.assertions(2);

	expect(100).toBeWithinRange(90, 110);
	expect(101).never.toBeWithinRange(0, 100);
});
```

## As Asymmetric Matchers

Custom matchers work as asymmetric matchers too:

```ts
expect({ apples: 6, bananas: 3 }).toEqual({
	apples: expect.toBeWithinRange(1, 10),
	bananas: expect.never.toBeWithinRange(11, 20),
});
```

## Global Registration

Register in `setupFilesAfterEnv` for all test files:

```ts
// setupJest.ts
import { expect } from "@rbxts/jest-globals";

expect.extend({
	toBeWithinRange(received: number, floor: number, ceiling: number) {
		// ...
	},
});
```

```ts
// jest.config.ts
export = {
	setupFilesAfterEnv: [script.Parent.setupJest],
};
```

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/ExpectAPI.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/Deviations.md
-->
