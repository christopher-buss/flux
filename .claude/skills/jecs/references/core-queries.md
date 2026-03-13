---
name: core-queries
description: |
    Use when querying entities by components, filtering, or caching queries in
    jecs
---

# Jecs Queries

Query, filter, and iterate entities with specific component combinations.

## Basic Query

```ts
import Jecs from "@rbxts/jecs";

const world = Jecs.world();

const Transform = world.component<CFrame>();
const Velocity = world.component<Vector3>();

// Iterate entities with both components
for (const [entityId, transform, velocity] of world.query(Transform, Velocity)) {
	world.set(entityId, Transform, transform.add(velocity));
}
```

Query returns entities that have **all** specified components.

## Query Filters

Refine queries with `with()` and `without()`.

```ts
// Create tags
const Walking = world.component();
const Flying = world.component();

// query() returns values - use for components you need to read
for (const [entityId, transform, velocity] of world.query(Transform, Velocity)) {
	world.set(entityId, Transform, transform.add(velocity));
}

// with() filters only - use for tags or components you don't need to read
for (const [entityId, transform, velocity] of world
	.query(Transform, Velocity)
	.with(Walking)
	.without(Flying)) {
	// Walking required but not returned - only transform and velocity available
	world.set(entityId, Transform, transform.add(velocity));
}
```

- `query(A, B)`: Returns values of A and B
- `with(...)`: Must have these components (filter only, no values returned)
- `without(...)`: Must NOT have these components

## Cached Queries

Cache for repeated iteration (systems). Faster iteration, slightly slower
creation.

```ts
// Create once, reuse every frame
const movementQuery = world.query(Transform, Velocity).cached();

// Fast iteration
for (const [entityId, transform, velocity] of movementQuery) {
	world.set(entityId, Transform, transform.add(velocity));
}
```

**When to cache:**

- Frame-by-frame systems: **Cache**
- Ad-hoc/one-time queries: **Don't cache**
- Dynamic runtime conditions: **Don't cache**

### Auto-Caching with Transformer

If
[rbxts-transformer-jecs](https://github.com/daimond113/rbxts-transformer-jecs)
is present, queries are automatically cached. Opt out with `/* no-cache */`:

```ts
// Auto-cached by transformer (no .cached() needed)
for (const [entityId, transform] of world.query(Transform)) {
	// ...
}

// Force uncached for ad-hoc/dynamic queries
for (const [entityId] of /* no-cache */ world.query(Transform)) {
	// ...
}
```

## Query Methods

```ts
const someEntity = world.entity();

const Transform = world.component<CFrame>();
const Velocity = world.component<Vector3>();

const query = world.query(Transform, Velocity);

// Iterate
for (const [entityId, transform, velocity] of query) {
	world.set(entityId, Transform, transform.add(velocity));
}

query.has(someEntity); // false

world.set(someEntity, Transform, new CFrame(0, 0, 0));
world.set(someEntity, Velocity, new Vector3(1, 0, 0));

// Check entity membership
query.has(someEntity); // true

// Get archetypes directly (advanced)
const archetypes = query.archetypes();
```

## Direct Archetype Access

Maximum performance for hot paths - eliminates function call overhead.

```ts
const cached = world.query(Transform, Velocity).cached();

for (const archetype of cached.archetypes()) {
	const entities = archetype.entities;
	const transforms = archetype.columns_map[Transform];
	const velocities = archetype.columns_map[Velocity];

	for (const [index, entity] of ipairs(entities)) {
		transforms[index] = transforms[index].add(velocities[index]);
	}
}
```

60-80% faster than iterator for tight loops.

### Automatic with Transformer

[rbxts-transformer-jecs](https://github.com/daimond113/rbxts-transformer-jecs)
automatically compiles queries to direct archetype access:

```ts
// You write this
for (const [id, a, b] of world.query(A, B).with(C)) {
	print(`${id} has A: ${a} and B: ${b}`);
}
```

```luau
-- Transformer compiles to this
local query_1 = world:query(A, B):with(C):cached()
local archetypes_1 = query_1:archetypes()
for _, archetype_1 in archetypes_1 do
	local entities_1 = archetype_1.entities
	local field_1 = archetype_1.columns_map
	local A_1 = field_1[A]
	local B_1 = field_1[B]
	for row_1 = #entities_1, 1, -1 do
		local id = entities_1[row_1]
		local a = A_1[row_1]
		local b = B_1[row_1]
		print(`{id} has A: {a} and B: {b}`)
	end
end
```

Write simple query syntax, get maximum performance automatically.

## Entity Lookup

Find entities with specific tag/component.

```ts
// All entities with a component
for (const entityId of world.each(Transform)) {
	print(entityId);
}

// All children of parent (ChildOf shortcut)
for (const child of world.children(parent)) {
	print(child);
}
```

## Wildcard Queries

Query relationships with any target.

```ts
import { pair, Wildcard } from "@rbxts/jecs";

const Likes = world.component();

// All entities that like something
for (const [entityId] of world.query(pair(Likes, Wildcard))) {
	const target = world.target(entityId, Likes);
	print(`${entityId} likes ${target}`);
}
```

See [feature-pairs](feature-pairs.md) for relationship details.

## Query Tradeoffs

| Type             | Creation | Iteration | Best For          |
| ---------------- | -------- | --------- | ----------------- |
| Uncached         | Fast     | Normal    | Ad-hoc queries    |
| Cached           | Slow     | Fast      | Per-frame systems |
| Archetype access | -        | Fastest   | Hot paths         |

## Common Patterns

**System pattern:**

```ts
import type { World } from "@rbxts/jecs";
import Jecs from "@rbxts/jecs";

const Transform = Jecs.component<CFrame>();
const Velocity = Jecs.component<Vector3>();
const Mass = Jecs.component<number>();

function physicsSystem(world: World, deltaTime: number): () => void {
	// Runs only once to create the cached query
	const physicsQuery = world.query(Transform, Velocity, Mass).cached();

	return () => {
		// Run every frame
		for (const [entity, transform, velocity, mass] of physicsQuery) {
			// Update physics
		}
	};
}
```

**Find first matching entity:**

```ts
import type { Entity } from "@rbxts/jecs";

const Target = world.component();
const Active = world.component();

function findFirstTarget(): Entity | undefined {
	// eslint-disable-next-line no-unreachable-loop -- Intended to return first match
	for (const [entity] of world.query(Target).with(Active)) {
		return entity;
	}

	return undefined;
}
```

<!--
Source references:
- how_to/020_queries.luau
- how_to/021_query_operators.luau
- how_to/022_query_caching.luau
-->
