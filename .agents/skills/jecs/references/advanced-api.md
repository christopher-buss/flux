---
name: advanced-api
description: |
    Use when preregistering components, bulk operations, or advanced type
    patterns in jecs
---

# Jecs Advanced API

Preregistration, bulk operations, and TypeScript types.

## Preregistering Components

Register components before world creation for stable IDs.

```ts
import Jecs, { component, meta, Name } from "@rbxts/jecs";

// Preregister (before world)
const Transform = component<CFrame>();
const Velocity = component<Vector3>();
const Dead = Jecs.tag();

// Add metadata before world
meta(Transform, Name, "Transform");
meta(Velocity, Name, "Velocity");

// Components registered when world created
const world = Jecs.world();
```

**Benefits:**

- Stable component IDs across sessions
- Metadata available immediately
- Cleaner module structure

## Bulk Operations

Insert or remove multiple components in a single archetype transition.

### bulk_insert

```ts
import { bulk_insert } from "@rbxts/jecs";

const Transform = world.component<CFrame>();
const Velocity = world.component<Vector3>();
const Mass = world.component<number>();
const Dead = world.component();

const entityId = world.entity();

// Insert multiple components at once
bulk_insert(
	world,
	entityId,
	[Transform, Velocity, Mass, Dead],
	[new CFrame(), new Vector3(1, 0, 0), 100, undefined],
);
```

Tags use `undefined` as placeholder value.

### bulk_remove

```ts
import { bulk_remove } from "@rbxts/jecs";

// Remove multiple components at once
bulk_remove(world, entityId, [Transform, Velocity, Mass]);
```

**Performance:** Single archetype transition vs multiple.

## Entity Records

Access internal entity storage info.

```ts
import { record } from "@rbxts/jecs";

const entityRecord = record(world, entityId);
// entityRecord.archetype - current archetype
// entityRecord.row - position in archetype
// entityRecord.dense - position in dense array
```

## Component Records

Access component storage metadata.

```ts
import { component_record } from "@rbxts/jecs";

const compRecord = component_record(world, Transform);
// compRecord.records - Map<ArchetypeId, column index>
// compRecord.counts - Map<ArchetypeId, entity count>
// compRecord.size - total entities with this component
```

## TypeScript Types

### Core Types

```ts
import type {
	Archetype, // Archetype storage
	CachedQuery, // Cached query
	Column, // Component column
	Entity, // Typed entity ID
	Id, // Entity or Pair
	Pair, // Relationship pair
	Query, // Query object
	Tag, // Entity with no data
	World, // World instance
} from "@rbxts/jecs";
```

### Type Inference

```ts
// Component type inference
const Health = world.component<number>();
type HealthType = InferComponent<typeof Health>; // number

// Pair type inference (first element if not tag)
const Owns = world.component<{ amount: number }>();
// Tag pair returns second element's type
type ChildData = InferComponent<Pair<Tag, Entity<string>>>; // string

type OwnsData = InferComponent<Pair<typeof Owns, Entity>>; // Gives { amount: number }
```

### Query Typing

```ts
// Query returns correctly typed tuple
for (const [entity, transform, velocity] of world.query(Transform, Velocity)) {
	// entity: Entity
	// transform: CFrame
	// velocity: Vector3
}

// Multiple get returns tuple
const [transform, velocity] = world.get(entityId, Transform, Velocity);
// transform: CFrame | undefined
// velocity: Vector3 | undefined
```

## Debug Mode

Enable runtime checks:

```ts
const world = Jecs.world(true); // DEBUG mode

// Throws on:
// - Structural changes in OnRemove during deletion
// - Invalid entity references
// - Component ID misuse
```

## is_tag Helper

Check if component is a tag (no data):

```ts
import Jecs, { is_tag } from "@rbxts/jecs";

const world = Jecs.world();
const Dead = world.component();
const Health = world.component<number>();

is_tag(world, Dead); // true
is_tag(world, Health); // false
```

Useful for serialization and networking logic.

## Quick Reference

| Function                         | Purpose                     |
| -------------------------------- | --------------------------- |
| `component<T>()`                 | Preregister typed component |
| `tag()`                          | Preregister tag             |
| `meta(e, id, value)`             | Set metadata before world   |
| `bulk_insert(w, e, ids, values)` | Insert multiple components  |
| `bulk_remove(w, e, ids)`         | Remove multiple components  |
| `record(w, e)`                   | Get entity record           |
| `component_record(w, id)`        | Get component record        |
| `is_tag(w, id)`                  | Check if tag                |

<!--
Source references:
- how_to/011_preregistering_components.luau
- src/jecs.d.ts
-->
