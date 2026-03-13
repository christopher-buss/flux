---
name: Matchers
description: |
    All built-in matchers for asserting values, types, equality, errors, and
    mock calls.
---

# Matchers

## Import

```ts
import { expect } from "@rbxts/jest-globals";
```

## Negation

Use `.never` (not `.not` — reserved keyword in Lua):

```ts
expect(value).never.toBe(0);
```

## Value Matchers

| Matcher                 | Checks                                                           |
| ----------------------- | ---------------------------------------------------------------- |
| `.toBe(value)`          | Strict equality (`==`). Use for primitives and reference checks. |
| `.toEqual(value)`       | Deep equality. Use for tables.                                   |
| `.toStrictEqual(value)` | Deep equality + metatable type check.                            |
| `.toBeUndefined()`      | Value is `nil`.                                                  |
| `.toBeTruthy()`         | Not `false` or `nil`. **`0` is truthy in Lua.**                  |
| `.toBeFalsy()`          | Only `false` or `nil`. **`0` is NOT falsy.**                     |
| `.toBeNan()`            | Value is `NaN`                                                   |

```ts
expect({ a: 1 }).toEqual({ a: 1 }); // deep equal
expect({ a: 1 }).never.toBe({ a: 1 }); // different references
expect(0).toBeTruthy(); // passes (Lua deviation)
```

## Number Matchers

| Matcher                      | Comparison                              |
| ---------------------------- | --------------------------------------- |
| `.toBeGreaterThan(n)`        | `>`                                     |
| `.toBeGreaterThanOrEqual(n)` | `>=`                                    |
| `.toBeLessThan(n)`           | `<`                                     |
| `.toBeLessThanOrEqual(n)`    | `<=`                                    |
| `.toBeCloseTo(n, digits?)`   | Approximate equality (default 2 digits) |

```ts
expect(0.1 + 0.2).toBeCloseTo(0.3, 5);
```

## String Matchers

| Matcher                 | Checks                         |
| ----------------------- | ------------------------------ |
| `.toMatch(pattern)`     | Lua string pattern or `RegExp` |
| `.toContain(substring)` | Exact substring (plain match)  |

```ts
expect("hello world").toMatch("hello");
expect("hello world").toContain("world");
```

## Table/Array Matchers

| Matcher                         | Checks                                         |
| ------------------------------- | ---------------------------------------------- |
| `.toContain(item)`              | Array contains item (strict equality)          |
| `.toContainEqual(item)`         | Array contains item (deep equality)            |
| `.toHaveLength(n)`              | `#` operator length (arrays/strings only)      |
| `.toHaveProperty(path, value?)` | Nested property exists (dot notation or array) |
| `.toMatchObject(subset)`        | Table contains all properties in subset        |

```ts
expect(["a", "b", "c"]).toContain("b");
expect([{ x: 1 }]).toContainEqual({ x: 1 });
expect({ a: { b: 2 } }).toHaveProperty("a.b", 2);
```

## Error Matchers

```ts
import { Error } from "@rbxts/luau-polyfill";

expect(() => {
	throw new Error("boom");
}).toThrow("boom"); // substring match
```

```ts
import RegExp from "@rbxts/regexp";

expect(() => {
	error("boom");
}).toThrow(RegExp("/^boom$/")); // regex match
```

```ts
import { Error } from "@rbxts/luau-polyfill";

class MyError extends Error {
	public override readonly name = "MyError";
}

expect(errorFn).toThrow(MyError); // Error class (LuauPolyfill)
```

Wrap the throwing code in a function — otherwise the error propagates before
`expect` can catch it.

## Mock Matchers

| Matcher                                | Checks                               |
| -------------------------------------- | ------------------------------------ |
| `.toHaveBeenCalledTimes(n)`            | Exact call count                     |
| `.toHaveBeenCalledWith(args...)`       | Called with specific args (any call) |
| `.toHaveBeenLastCalledWith(args...)`   | Last call had these args             |
| `.toHaveBeenNthCalledWith(n, args...)` | Nth call had these args (1-indexed)  |
| `.toHaveReturnedTimes(n)`              | Returned successfully n times        |
| `.toHaveReturnedWith(value)`           | Returned specific value              |
| `.toHaveLastReturnedWith(value)`       | Last return was specific value       |
| `.toHaveNthReturnedWith(n, value)`     | Nth return was specific value        |

```ts
const [mock] = jest.fn();
mock("a");
mock("b");
expect(mock).toHaveBeenCalledTimes(2);
expect(mock).toHaveBeenNthCalledWith(1, "a");
```

## Roblox-Specific Matchers

### `.toMatchInstance(table)`

Match a Roblox Instance against expected properties:

```ts
expect(scrollingFrame).toMatchInstance({
	ListLayout: {
		ClassName: "UIListLayout",
	},
	Name: "MyList",
	Position: new UDim2(0.5, 0, 0.5, 0),
});
```

### `.toBeInstanceOf(prototype)`

Check metatable inheritance using LuauPolyfill's `instanceof`:

```ts
expect(new A()).toBeInstanceOf(A);
expect(child).toBeInstanceOf(Parent);
```

## Assertion Count

```ts
it("should async callbacks run", () => {
	expect.assertions(2); // exactly 2 assertions must run
});
```

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/ExpectAPI.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/UsingMatchers.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/Deviations.md
-->
