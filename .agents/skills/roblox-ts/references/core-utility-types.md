---
name: core-utility-types
description: |
    Use when doing advanced type manipulation with Roblox instances in roblox-ts
---

# Utility Types and Macros

## Type Constraints

Prefer `satisfies` for type-checking object literals:

```ts
interface PlayerData {
	name: string;
	active: boolean;
	score: number;
}

// ✅ Preferred: satisfies (preserves literal types)
const data = {
	name: "Alice",
	active: true,
	score: 100,
} satisfies PlayerData;

// Config objects
const config = {
	player1: { name: "Bob", active: true, score: 50 } satisfies PlayerData,
	player2: { name: "Eve", active: false, score: 75 } satisfies PlayerData,
};
```

## Instance Type Utilities

Extract property, method, or event names from Instance types:

```ts
type PartEvents = InstanceEventNames<Part>;
// "Touched" | "TouchEnded" | "ChildAdded" | "Destroying" | ...

type PartMethods = InstanceMethodNames<Part>;
// "ApplyImpulse" | "GetMass" | "GetTouchingParts" | "Resize" | ...

type PartProps = InstancePropertyNames<Part>;
// "Anchored" | "CFrame" | "Size" | "Color" | "CanCollide" | ...

type WritablePartProps = WritablePropertyNames<Part>;
// Same as above but excludes readonly (AssemblyMass, etc.)
```

## Services and Instances Interfaces

Type-safe dynamic instance creation and service lookups:

```ts
// All creatable instance names
type Creatable = keyof CreatableInstances;
// "Part" | "Frame" | "RemoteEvent" | ...

// All service names
type ServiceName = keyof Services;
// "Workspace" | "Players" | "ReplicatedStorage" | ...

// Generic helper for type-safe descendants
function findDescendantsOfClass<T extends keyof Instances>(
	parent: Instance,
	instanceType: T,
): Array<Instances[T]> {
	return parent.GetDescendants().filter((desc): desc is Instances[T] => {
		return desc.IsA(instanceType);
	});
}

// Usage
const parts = findDescendantsOfClass(Workspace, "Part");
// parts is typed as Array<Part>
```

## Extract and Exclude by Type

Filter object members by value type:

```ts
interface Mixed {
	name: string;
	active: boolean;
	count: number;
	data: string;
}

// Keys where value does NOT extend string: "count" | "active"
type NonStringKeys = ExcludeKeys<Mixed, string>;

// Keys where value extends string: "name" | "data"
type StringKeys = ExtractKeys<Mixed, string>;

// Object with only string members
type StringMembers = ExtractMembers<Mixed, string>;
```

<!--
Source references:
- https://roblox-ts.com/docs/api/utility-types
- https://roblox-ts.com/docs/api/functions
-->
