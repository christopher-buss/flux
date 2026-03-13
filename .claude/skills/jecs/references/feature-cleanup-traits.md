---
name: feature-cleanup-traits
description: |
    Use when configuring automatic cleanup behavior for component/entity
    deletion in jecs
---

# Jecs Cleanup Traits

Cleanup traits define what happens when components or relationship targets are
deleted.

## Cleanup Actions

| Action   | Effect                                           |
| -------- | ------------------------------------------------ |
| `Remove` | Remove the component from all entities (default) |
| `Delete` | Delete all entities that have the component      |

## Cleanup Conditions

| Condition        | Triggers When                       |
| ---------------- | ----------------------------------- |
| `OnDelete`       | The component/tag itself is deleted |
| `OnDeleteTarget` | A relationship target is deleted    |

## Configuration

Apply traits as pairs on components:

```ts
import Jecs, { Delete, OnDelete, pair, Remove } from "@rbxts/jecs";

const world = Jecs.world();

// (OnDelete, Remove) - Default behavior
const Tag = world.entity();
world.add(Tag, pair(OnDelete, Remove));

// (OnDelete, Delete) - Cascade deletion
const Critical = world.entity();
world.add(Critical, pair(OnDelete, Delete));
```

## OnDelete Behaviors

### OnDelete + Remove (Default)

When component deleted, remove it from all entities.

```ts
const Buff = world.entity();
world.add(Buff, pair(OnDelete, Remove));

const entityId = world.entity();
world.add(entityId, Buff);

world.delete(Buff);
world.has(entityId, Buff); // false (removed)
world.contains(entityId); // true (still exists)
```

### OnDelete + Delete

When component deleted, delete all entities that have it.

```ts
const Temporary = world.entity();
world.add(Temporary, pair(OnDelete, Delete));

const entityId = world.entity();
world.add(entityId, Temporary);

world.delete(Temporary);
world.contains(entityId); // false (deleted)
```

## OnDeleteTarget Behaviors

For relationships - trigger when target entity is deleted.

### OnDeleteTarget + Remove

Remove relationship when target deleted.

```ts
const OwnedBy = world.component();
world.add(OwnedBy, pair(OnDeleteTarget, Remove));

const loot = world.entity();
const player = world.entity();
world.add(loot, pair(OwnedBy, player));

world.delete(player);
world.has(loot, pair(OwnedBy, player)); // false
world.contains(loot); // true (loot still exists)
```

### OnDeleteTarget + Delete (Hierarchy)

Delete entities when their relationship target is deleted.

```ts
// ChildOf has this built-in
const CustomChildOf = world.component();
world.add(CustomChildOf, pair(OnDeleteTarget, Delete));

const parent = world.entity();
const child = world.entity();
world.add(child, pair(CustomChildOf, parent));

world.delete(parent);
world.contains(child); // false (cascaded)
```

**Note:** `ChildOf` has this trait built-in.

## Built-in Cleanup Traits

| Component | Cleanup Trait              |
| --------- | -------------------------- |
| `ChildOf` | `(OnDeleteTarget, Delete)` |

`ChildOf` also has the `Exclusive` trait (one parent only) - see
[feature-pairs](feature-pairs.md#exclusive-relationships).

## Common Patterns

**Faction membership:**

```ts
const MemberOf = world.component();
world.add(MemberOf, pair(OnDeleteTarget, Remove));
// Deleting faction removes membership, keeps entities
```

**Scene hierarchy:**

```ts
const InScene = world.component();
world.add(InScene, pair(OnDeleteTarget, Delete));
// Deleting scene deletes all entities in it
```

**Equipment slots:**

```ts
const EquippedBy = world.component();
world.add(EquippedBy, pair(OnDeleteTarget, Remove));
// Player deletion removes equipment reference, keeps items
```

## Performance Note

Relationships increase archetype count. Each `pair(Relation, target)` creates
new archetypes. Cleanup traits help manage this but consider fragmentation for
heavy relationship use.

See [best-practices-archetypes](best-practices-archetypes.md) for fragmentation
details.

<!--
Source references:
- how_to/100_cleanup_traits.luau
-->
