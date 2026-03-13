---
name: Asymmetric Matchers
description: |
    Flexible value matching with expect.anything(), expect.any(),
    expect.callable(), and asymmetric variants.
---

# Asymmetric Matchers

Asymmetric matchers can be used inside `toEqual`, `toBeCalledWith`,
`toMatchObject`, and other deep-comparison matchers as placeholder values.

## Import

```ts
import { expect } from "@rbxts/jest-globals";
```

## `expect.anything()`

Matches anything except `nil`:

```ts
expect(mock).toHaveBeenCalledWith(expect.anything());
```

## `expect.any(typename | prototype)`

Matches by type string or prototype class:

```ts
// Type strings
expect({ id: 42 }).toStrictEqual({ id: expect.any("number") });
expect({ name: "foo" }).toStrictEqual({ name: expect.any("string") });

// Prototype class (uses LuauPolyfill instanceof)
expect(instance).toEqual(expect.any(MyClass));
```

Supports Roblox types (`DateTime`), Luau types (`thread`), and LuauPolyfill
types (`Error`, `Set`, `Symbol`, `RegExp`).

## `expect.nothing()`

Matches only `nil`. Use to assert a key is absent in `toMatchObject`:

```ts
expect({ foo: "bar" }).toMatchObject({
	foo: "bar",
	missing: expect.nothing(),
});
```

## `expect.callable()`

Matches anything that can be called — functions, callable tables, and callable
userdata. Prefer over `expect.any("function")`:

```ts
expect(callback).toStrictEqual(expect.callable());
```

## `expect.arrayContaining(array)`

Matches a received array that contains all elements of the expected array
(subset check):

```ts
expect(["a", "b", "c"]).toStrictEqual(expect.arrayContaining(["a", "c"]));
```

## `expect.objectContaining(table)`

Matches a received table containing all expected key-value pairs:

```ts
expect({ x: 1, y: 2, z: 3 }).toStrictEqual(expect.objectContaining({ x: 1, y: 2 }));
```

## `expect.stringContaining(string)`

Matches a string containing the expected substring:

```ts
expect("hello world").toStrictEqual(expect.stringContaining("world"));
```

## `expect.stringMatching(pattern | regexp)`

Matches a string against a Lua pattern or `RegExp`:

```ts
import { RegExp } from "@rbxts/regexp";

expect("abc123").toStrictEqual(expect.stringMatching("%d+"));
expect("abc123").toStrictEqual(expect.stringMatching(RegExp("\\d+")));
```

## Negated Asymmetric Matchers

All asymmetric matchers have `.never` variants:

```ts
import { RegExp } from "@rbxts/regexp";

expect(["a", "b"]).toStrictEqual(expect.never.arrayContaining(["c"]));
expect({ x: 1 }).toStrictEqual(expect.never.objectContaining({ y: 2 }));
expect("hello").toStrictEqual(expect.never.stringContaining("bye"));
expect("hello").toStrictEqual(expect.never.stringMatching(RegExp("^bye")));
```

## `.resolves` and `.rejects`

Unwrap Promises before matching. **Must return** the assertion:

```ts
it("should resolve promises", async () => {
	expect.assertions(1);

	await expect(Promise.resolve("ok")).resolves.toBe("ok");
});

it("should reject promises", async () => {
	expect.assertions(1);

	await expect(Promise.reject(new Error("fail"))).rejects.toThrow("fail");
});
```

## Nesting Asymmetric Matchers

Matchers compose freely:

```ts
expect(data).toEqual({
	users: expect.arrayContaining([
		expect.objectContaining({
			name: expect.any("string"),
			email: expect.stringMatching(RegExp("@")),
		}),
	]),
});
```

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/ExpectAPI.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/Deviations.md
-->
