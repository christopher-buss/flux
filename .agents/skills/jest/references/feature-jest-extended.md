---
name: Jest Extended Matchers
description:
    Use when core Jest matchers aren't expressive enough — checking exact
    booleans (critical in Luau where 0 is truthy), number ranges, string
    patterns, array membership, object keys/values/entries, mock call order,
    or verifying side effects with mutation matchers.
---

# Jest Extended Matchers

Port of [jest-extended](https://github.com/jest-community/jest-extended) for
roblox-ts. Adds 60+ matchers on top of core Jest Roblox.

## Setup

```bash
pnpm add @rbxts/jest-extended
```

Register all matchers in your setup file (referenced by `setupFilesAfterEnv`):

```ts
import * as matchers from "@rbxts/jest-extended";
import { expect } from "@rbxts/jest-globals";

expect.extend(matchers);
```

Or register selectively:

```ts
import { toBeFalse, toBeTrue } from "@rbxts/jest-extended";

expect.extend({ toBeFalse, toBeTrue });
```

Types load automatically. All matchers support `.never` negation.

## Boolean Matchers

Especially important in Luau where `0`, `""`, and `{}` are truthy —
`toBeTruthy()` won't catch these.

```ts
expect(true).toBeTrue();
expect(false).toBeFalse();
expect(true).toBeBoolean();

expect(1).never.toBeTrue(); // 1 is truthy but not true
expect(0).never.toBeFalse(); // 0 is truthy in Luau
```

## Number Matchers

```ts
expect(42).toBeNumber();
expect(1).toBePositive();
expect(-1).toBeNegative();
expect(4).toBeEven();
expect(3).toBeOdd();
expect(5).toBeInteger();
expect(42).toBeFinite();
expect(math.huge).never.toBeFinite();
```

### Range Checks

```ts
// toBeWithin: start inclusive, end exclusive
expect(5).toBeWithin(1, 10);
expect(10).never.toBeWithin(1, 10);

// toBeInRange: both inclusive
expect(10).toBeInRange(1, 10);

// toBeBetween: for date-like values, both inclusive
expect(date).toBeBetween(startDate, endDate);
```

## String Matchers

```ts
expect("hello").toBeString();
expect("0xFF").toBeHexadecimal();
expect(symbol).toBeSymbol();

const greeting = "hello world";
expect(greeting).toStartWith("hello");
expect(greeting).toEndWith("world");
expect(greeting).toInclude("world");
expect("hello beautiful world").toIncludeMultiple(["hello", "world"]);
expect("abc_abc").toIncludeRepeated("abc", 2);

expect("Hello").toEqualCaseInsensitive("hello");
expect("  hello   world  ").toEqualIgnoringWhitespace("hello world");
```

## Array Matchers

```ts
expect([1, 2, 3]).toBeArray();
expect([1, 2, 3]).toBeArrayOfSize(3);
expect([]).toBeEmpty(); // also works on strings and objects
```

### Member Checks

```ts
// contains all (order-independent)
expect([1, 2, 3]).toIncludeAllMembers([2, 1]);

// contains at least one
expect([1, 2, 3]).toIncludeAnyMembers([2, 5]);

// exact same members (order-independent)
expect([1, 2, 3]).toIncludeSameMembers([3, 1, 2]);

// partial object matching
expect([
	{ name: "Alice", age: 30 },
	{ name: "Bob", age: 25 },
]).toIncludeAllPartialMembers([{ name: "Alice" }, { name: "Bob" }]);

// exact same members with partial matching (order-independent)
expect([
	{ name: "Alice", age: 30 },
	{ name: "Bob", age: 25 },
]).toIncludeSamePartialMembers([{ name: "Bob" }, { name: "Alice" }]);

expect([{ name: "Alice", age: 30 }]).toPartiallyContain({ name: "Alice" });
```

### Predicate Checks

```ts
expect(2).toSatisfy((value: number) => value > 0);
expect([2, 4, 6]).toSatisfyAll((value: number) => value % 2 === 0);
expect([1, 2, 3]).toSatisfyAny((value: number) => value > 2);
```

## Object Matchers

```ts
expect({ a: 1 }).toBeObject();
expect({}).toBeEmptyObject();
expect(table.freeze({ a: 1 })).toBeFrozen();
```

### Key / Value / Entry Checks

Each has singular, plural, `All`, and `Any` variants:

```ts
// keys
expect({ a: 1, b: 2 }).toContainKey("a");
expect({ a: 1, b: 2 }).toContainKeys(["a", "b"]);
expect({ a: 1, b: 2 }).toContainAllKeys(["a", "b"]);
expect({ a: 1 }).toContainAnyKeys(["a", "z"]);

// values
expect({ a: 1, b: 2 }).toContainValue(1);
expect({ a: 1, b: 2 }).toContainValues([1, 2]);
expect({ a: 1, b: 2 }).toContainAllValues([1, 2]);
expect({ a: 1 }).toContainAnyValues([1, 99]);

// entries ([key, value] pairs)
expect({ a: 1 }).toContainEntry(["a", 1]);
expect({ a: 1, b: 2 }).toContainEntries([
	["a", 1],
	["b", 2],
]);
expect({ a: 1, b: 2 }).toContainAllEntries([
	["a", 1],
	["b", 2],
]);
expect({ a: 1 }).toContainAnyEntries([
	["a", 1],
	["z", 99],
]);
```

## Mock Matchers

Remember: `jest.fn()` returns two values in Jest Roblox.

```ts
const [mock, func] = jest.fn();
func();
expect(mock).toHaveBeenCalledOnce();

const [mock2, func2] = jest.fn();
func2("hello", 42);
expect(mock2).toHaveBeenCalledExactlyOnceWith("hello", 42);
```

### Call Order

```ts
const [mockA, funcA] = jest.fn();
const [mockB, funcB] = jest.fn();
funcA();
funcB();
expect(mockA).toHaveBeenCalledBefore(mockB);
expect(mockB).toHaveBeenCalledAfter(mockA);
```

## Date Matchers

```ts
expect(DateTime.now()).toBeDate();
expect(DateTime.now()).toBeValidDate();
expect(earlier).toBeBefore(later);
expect(later).toBeAfter(earlier);
expect(date).toBeBeforeOrEqualTo(date); // same date passes
expect(date).toBeAfterOrEqualTo(date);
```

## Mutation Matchers

Test that calling a function causes a side effect. First argument is the
function to call, second is a checker that reads the observed value.

```ts
let count = 0;
function increment(): void {
	count += 1;
}

expect(increment).toChange(() => count);

function addFive(): void {
	count += 5;
}

expect(addFive).toChangeBy(() => count, 5);

let status = "pending";
function complete(): void {
	status = "done";
}

expect(complete).toChangeTo(() => status, "done");
```

## General Matchers

```ts
expect("a").toBeOneOf(["a", "b", "c"]);
expect(print).toBeFunction();
expect().pass();
expect().fail("should not reach here");
```

### `.toThrowWithMessage(errorType, message)`

Asserts throw type and message. Message can be a string or RegExp.

```ts
import { Error } from "@rbxts/luau-polyfill";
import RegExp from "@rbxts/regexp";

class CustomError extends Error {}

expect(() => {
	throw new CustomError("something broke");
}).toThrowWithMessage(CustomError, "something broke");

// RegExp matching
expect(() => {
	throw new CustomError("error: code 42");
}).toThrowWithMessage(CustomError, new RegExp("code \\d+"));
```

## Unported Matchers

These JS jest-extended matchers are **not available**:

- `toResolve` / `toReject` (async matchers)
- `toBeBigInt`, `toBeSealed`, `toBeExtensible` (no Luau equivalent)
- `toBeNil`, `toBeNaN` (use core Jest `.toBeNil()` / `.toBeNaN()`)
- `toBeDateString` (no Luau equivalent)

<!--
Source references:
- https://github.com/christopher-buss/rbxts-jest-extended
- https://github.com/christopher-buss/rbxts-jest-extended/blob/main/src/matchers/index.ts
-->
