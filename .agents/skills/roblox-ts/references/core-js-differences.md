---
name: core-js-differences
description: |
    Use when writing roblox-ts code and unsure if a JavaScript API exists
---

# JavaScript APIs That Don't Exist

roblox-ts is "Roblox with TypeScript syntax", not full JavaScript. Many standard
JS APIs don't exist.

## Object Methods

`Object` is only a type, not a value. These all fail:

```ts
// ❌ COMPILE ERRORS
Object.keys({ a: 1 });
Object.values({ a: 1 });
Object.entries({ a: 1 });
Object.assign({}, { a: 1 });
```

**Alternatives:**

```ts
// Iterate with pairs()
for (const [key, value] of pairs(obj)) {
	print(key, value);
}

// Or use a Map instead
const map = new Map<string, number>([["a", 1]]);
```

```ts
// Or import polyfill when needed
import { Object } from "@rbxts/luau-polyfill";

const keys = Object.keys({ a: 1 }); // works
```

## typeof Operator

The `typeof` operator is NOT supported:

```ts
// ❌ COMPILE ERROR
// eslint-disable-next-line roblox/no-value-typeof -- Example
if (typeof value === "number") {
	// Error
}

// ✅ Use typeIs macro (compiles to type(), narrows TS type)
if (typeIs(value, "number")) {
	print(value * 2); // value is now number
}

// ✅ Use typeOf function (compiles to typeof(), no narrowing)
if (typeOf(value) === "number") {
	// value is still unknown here
}
```

**Note:** `typeIs` compiles to `type()` for Lua primitives (number, string,
boolean) or `typeof()` for Roblox types (Vector3, CFrame, Instance). `typeOf`
always compiles to Roblox's `typeof()`.

## assert() Uses JavaScript Truthiness

Unlike Luau, `assert()` uses JavaScript truthiness. `0`, `""`, and `NaN` are
falsy and will throw:

```ts
// ❌ THROWS in roblox-ts (works in pure Luau)
assert(0); // Error: 0 is falsy
assert(""); // Error: empty string is falsy
assert(NaN); // Error: NaN is falsy

// ✅ These work
assert(1);
assert("text");
assert(true);
```

This enables TypeScript's `asserts` predicate for type narrowing:

```ts
function process(instance: Instance): void {
	assert(instance.IsA("Part"), "Expected a Part");
	// instance is now typed as Part
	print(instance.Size);
}
```

## The `any` Type

Using `any` values errors at compile time:

```ts
// eslint-disable-next-line roblox/no-any -- Example
function broken(value: any): void {
	print(value + 1); // ❌ Error: Using values of type `any` is not supported!
}
```

Use `unknown` and narrow instead:

```ts
function works(value: unknown): void {
	if (typeIs(value, "number")) {
		print(value + 1); // ✅ value is now number
	}
}
```

## JSON

`JSON` doesn't exist. Use HttpService:

```ts
import { HttpService } from "@rbxts/services";

// ❌ COMPILE ERROR
JSON.parse('{"a":1}');
JSON.stringify({ a: 1 });

// ✅ Use HttpService
HttpService.JSONDecode('{"a":1}');
HttpService.JSONEncode({ a: 1 });
```

## console

`console` doesn't exist:

```ts
// ❌ COMPILE ERROR
console.log("test");

// ✅ Use Roblox globals
print("test");
warn("warning");
error("error message");
```

## setTimeout / setInterval

These don't exist. Use the `task` library:

```ts
// ❌ COMPILE ERROR
setTimeout(() => print("delayed"), 1000);
setInterval(() => print("repeated"), 1000);

// ✅ Use task library
task.delay(1, () => print("after 1 second"));
task.spawn(() => print("immediate coroutine"));
task.wait(1); // yields for 1 second
```

## What DOES Work

Array methods are polyfilled:

```ts
const array = [1, 2, 3, 4, 5];
array.filter((x) => x > 2); // ✅
array.map((x) => x * 2); // ✅
array.reduce((accumulator, x) => accumulator + x, 0); // ✅
array.find((x) => x === 3); // ✅
array.some((x) => x > 4); // ✅
array.every((x) => x > 0); // ✅
array.includes(3); // ✅
```

String methods use Lua names:

```ts
const str = "hello";
str.upper(); // ✅ (not toUpperCase)
str.lower(); // ✅ (not toLowerCase)
str.split(" "); // ✅
```

<!--
Source references:
- Verified via rbxtsc compilation tests
- https://roblox-ts.com/docs/api/roblox-api
-->
