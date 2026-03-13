---
name: best-practices-archetypes
description: |
    Use when understanding archetype storage, entity transitions, or dealing
    with fragmentation in jecs
---

# Jecs Archetypes

Archetypes are the core storage unit. Understanding them helps optimize
performance.

## What is an Archetype?

An archetype represents a unique combination of components. All entities with
exactly the same component set belong to the same archetype.

```ts
import Jecs from "@rbxts/jecs";

const world = Jecs.world();

const Position = world.component<Vector3>();
const Velocity = world.component<Vector3>();
const Mass = world.component<number>();

const entityId = world.entity();
world.set(entityId, Position, Vector3.zero); // creates archetype [Position]
world.set(entityId, Velocity, Vector3.zero); // moves to archetype [Position, Velocity]

const entityId2 = world.entity();
world.set(entityId2, Position, Vector3.zero); // archetype [Position] exists
world.set(entityId2, Velocity, Vector3.zero); // archetype [Position, Velocity] exists
world.set(entityId2, Mass, 100); // creates archetype [Position, Velocity, Mass]

// e1 in [Position, Velocity]
// e2 in [Position, Velocity, Mass]
```

## Archetype Transitions

When adding/removing components, entities move between archetypes:

1. Remove entity from old archetype's entity list
2. Copy component data to new archetype's columns
3. Add entity to new archetype's entity list
4. Update entity record (archetype pointer, row index)

**This is why add/remove is more expensive than set.** Setting values doesn't
change archetypes.

## Archetype Graph

Archetypes form a cached graph:

```text
ROOT_ARCHETYPE
    └── +Position → [Position]
                        └── +Velocity → [Position, Velocity]
                                            └── +Mass → [Position, Velocity, Mass]
```

Edges are cached bidirectionally. Adding a component follows an edge; if no edge
exists, a new archetype is created.

## Fragmentation

Fragmentation occurs when entities spread across many archetypes, especially
with relationships.

```ts
const Likes = world.component();

world.add(e1, pair(Likes, alice)); // archetype [pair(Likes, alice)]
world.add(e2, pair(Likes, bob)); // archetype [pair(Likes, bob)]
world.add(e3, pair(Likes, charlie)); // archetype [pair(Likes, charlie)]
// 3 different archetypes!
```

**Impact:**

- More archetypes = more archetype creation overhead
- Queries must iterate more archetypes
- Wildcard indices add registration overhead (each relationship pair registers
  with `pair(R, T)`, `pair(R, Wildcard)`, and `pair(Wildcard, T)` indices)

## When Fragmentation Matters

Fragmentation from relationships is often acceptable. Relationships provide
auto-cleanup on target deletion and queryable graph semantics. Only optimize if
profiling shows a bottleneck.

**Alternative when you don't need relationship semantics:**

```ts
// Relationship approach: One archetype per target, but auto-cleanup on delete
world.add(entity, pair(Likes, uniqueTarget));

// Data approach: Shared archetype, but manual cleanup required
const LikesSomeone = Jecs.tag();
world.add(entity, LikesSomeone);
world.set(entity, LikesTarget, targetEntity); // Store target as component data
```

**Batch component operations:**

```ts
import { bulk_insert, bulk_remove } from "@rbxts/jecs";

// BAD: Multiple archetype transitions
world.set(entity, Position, Vector3.zero);
world.set(entity, Velocity, Vector3.zero);
world.set(entity, Mass, 100);

// BETTER: Single transition
bulk_insert(world, entity, [Position, Velocity, Mass], [Vector3.zero, Vector3.zero, 100]);

// Batch removal
bulk_remove(world, entity, [Velocity, Mass]);
```

## Archetype Lifecycle

**Empty archetypes persist** for recycling. They don't slow down queries
(`query.archetypes()` skips empty archetypes automatically).

**Archetypes are invalidated** (auto-deleted) when one of their component IDs
can no longer be used (e.g., relationship target entity is deleted).

**Manual cleanup** removes empty archetypes to free memory:

```ts
world.cleanup();
```

**When to call `cleanup()`:**

- Every ~15 seconds during gameplay, OR
- When archetype count exceeds ~100
- After mass entity deletion (especially with relationships)

## Performance Guidelines

| Operation                  | Cost     | Notes                            |
| -------------------------- | -------- | -------------------------------- |
| `set` (existing component) | Low      | Same archetype                   |
| `add`/`remove`             | Medium   | Archetype transition             |
| New archetype creation     | High     | Graph update, query cache update |
| Query iteration            | Very low | Especially cached                |

**Rules of thumb:**

1. Minimize component add/remove during gameplay
2. Prefer `set` over `add`+`set`
3. Cache frequently-used queries
4. Use `bulk_insert`/`bulk_remove` for batched operations
5. Call `cleanup()` periodically or after mass deletions

<!--
Source references:
- how_to/030_archetypes.luau
- how_to/040_fragmentation.luau
-->
