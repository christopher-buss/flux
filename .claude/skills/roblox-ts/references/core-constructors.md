---
name: core-constructors
description: |
    Use when creating Roblox data types and instances in roblox-ts
---

# Constructors and DataTypes

## Constructor Syntax

Use `new` for all Roblox constructors. It compiles to `.new()`:

```ts
const vector3 = new Vector3(1, 2, 3); // Vector3.new(1, 2, 3)
const cframe = new CFrame(0, 10, 0); // CFrame.new(0, 10, 0)
const udim = new UDim2(1, 0, 1, 0); // UDim2.new(1, 0, 1, 0)
const part = new Instance("Part"); // Instance.new("Part")
const ray = new Ray(origin, direction); // Ray.new(origin, direction)
```

## DataType Math

TypeScript doesn't support operator overloading. Use macro methods:

```ts
const v1 = new Vector3(1, 2, 3);
const v2 = new Vector3(4, 5, 6);

// ❌ WON'T WORK
// const sum = v1 + v2;

// ✅ Use macro methods
const sum = v1.add(v2); // Compiles to: v1 + v2
const diff = v1.sub(v2); // Compiles to: v1 - v2
const scaled = v1.mul(2); // Compiles to: v1 * 2
const divided = v1.div(2); // Compiles to: v1 / 2
```

Works with: Vector2, Vector3, CFrame, UDim, UDim2, Color3, and other math types.

## nil vs undefined

Use `undefined` in place of Lua's `nil`:

```ts
const value: string | undefined = undefined;

if (value === undefined) {
	print("no value");
}

// Setting to nil
part.Parent = undefined;
```

## Collections

```ts
// Array with preallocation
const array = new Array<number>(100); // table.create(100)
const filled = new Array<number>(100, 0); // table.create(100, 0)

// Map and Set
const map = new Map<string, number>([["key", 42]]);
const value = map.get("key");

const set = new Set<string>(["item"]);
set.has("item");

// WeakMap/WeakSet (uses __mode = "k")
const weakMap = new WeakMap<Instance, number>();
```

<!--
Source references:
- https://roblox-ts.com/docs/api/roblox-api
- https://roblox-ts.com/docs/api/constructors
- https://roblox-ts.com/docs/guides/datatype-math
-->
