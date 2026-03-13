---
name: core-type-checking
description: |
    Use when validating types at runtime in roblox-ts, especially for RemoteEvent args
---

# Runtime Type Checking

## typeIs Macro

`typeIs(value, typeName)` narrows the TypeScript type. It compiles to `type()`
for Lua primitives or `typeof()` for Roblox types:

```ts
function handle(value: unknown): void {
	// Luau: `if type(_value) == "number" then`
	if (typeIs(value, "number")) {
		// value is now `number`
		print(value * 2);
	}

	// Luau: `if typeof(_value) == "Vector3" then`
	if (typeIs(value, "Vector3")) {
		// value is now `Vector3`
		print(value.X, value.Y, value.Z);
	}
}
```

## classIs Macro

`classIs(instance, className)` checks exact ClassName (not inheritance):

```ts
function handle(instance: Instance): void {
	// IsA returns true for subclasses
	if (instance.IsA("Script")) {
		// Could be Script OR LocalScript
	}

	// classIs checks exact class
	if (classIs(instance, "Script")) {
		// Exactly Script, not LocalScript
	}
}
```

## RemoteEvent Validation

Client-to-server args are `unknown` because clients can send anything:

```ts
const remote = new Instance("RemoteEvent");

remote.OnServerEvent.Connect((player: Player, points: unknown) => {
	// ❌ WRONG: Trusting client data
	// print(points * 2);

	// ✅ CORRECT: Validate first
	if (!typeIs(points, "number")) {
		return;
	}

	// points is now safely a number
	print(points * 2);
});
```

For complex validation, use `@rbxts/t`:

```ts
import { t } from "@rbxts/t";

const isPlayerData = t.interface({
	name: t.string,
	score: t.number,
});

remote.OnServerEvent.Connect((player, data: unknown) => {
	if (!isPlayerData(data)) {
		return;
	}

	// data is now typed as { score: number, name: string }
	print(data.name, data.score);
});
```

## typeOf Function

`typeOf(value)` returns the Luau type string but doesn't narrow:

```ts
const typeName = typeOf(value); // "number", "string", "Vector3", etc.

// No type narrowing - value is still unknown
if (typeOf(value) === "number") {
	// value is still `unknown` here
}
```

Use `typeIs` instead when you need type narrowing.

<!--
Source references:
- https://roblox-ts.com/docs/api/functions
- https://roblox-ts.com/docs/api/roblox-api#remoteevent-types
-->
