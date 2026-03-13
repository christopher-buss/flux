---
name: core-basics
description: |
    Use when creating worlds, entities, components, tags, or singletons in jecs
---

# Jecs Core Basics

World, entities, components, tags, and singletons in jecs ECS.

## World Creation

```ts
import Jecs from "@rbxts/jecs";

const world = Jecs.world();
```

## Entities

Entities are unique IDs (48-bit: 24-bit index + 24-bit generation).

```ts
import type { Entity } from "@rbxts/jecs";
import { ECS_GENERATION, ECS_ID } from "@rbxts/jecs";

// Create entity
const entityId = world.entity();

// Create at specific ID
world.entity(42 as Entity);

// Check existence
world.contains(entityId); // true if alive with correct generation
world.exists(entityId); // true if ID exists (ignores generation)

// Delete entity (removes all components, triggers cleanup)
world.delete(entityId);

// Entity ID introspection
const index = ECS_ID(entityId);
const generation = ECS_GENERATION(entityId);
```

**Generation:** When entities are recycled, generation increments. Stale
references fail `contains()` check.

## Components

Components are typed data attached to entities. IDs occupy range 1-256.

```ts
// Create typed component
const Transform = world.component<CFrame>();
const Health = world.component<number>();

// Set component data
world.set(entityId, Transform, new CFrame(10, 20, 30));
world.set(entityId, Health, 100);

// Get component data (returns T | undefined)
const transform = world.get(entityId, Transform);
const health = world.get(entityId, Health);
assert(health !== undefined, "Entity must have health");

// Check component presence (up to 4)
world.has(entityId, Transform);
world.has(entityId, Transform, Health);

// Remove component
world.remove(entityId, Transform);

// Clear all components (keeps entity)
world.clear(entityId);
```

**Mental Model:** C

- Components = columns
- Entities = rows
- `set`/`get`/`remove` = cell operations

## Tags

Tags are components with no data (zero storage cost).

```ts
// Create tag (before world)
const Dead = Jecs.tag();

// Or use regular entity as tag
const Enemy = world.entity();

// Add tag (not set!)
world.add(entityId, Dead);
world.add(entityId, Enemy);

// Check/remove same as components
world.has(entityId, Dead);
world.remove(entityId, Dead);
```

**Key Difference:** `world.add()` for tags, `world.set()` for data components.

## Singletons

Use component ID as both key and entity for global resources.

```ts
const TimeOfDay = world.component<number>();

// Set singleton
world.set(TimeOfDay, TimeOfDay, 12.5);

// Get singleton
const time = world.get(TimeOfDay, TimeOfDay);
assert(time !== undefined, "Singleton must have value");

// Time of day is now 12.5
```

## Entity Ranges

Reserve ID ranges for client/server separation.

```ts
// Restrict entity creation to range [1000, 5000]
world.range(1000, 5000);

// Open-ended range (5000+)
world.range(5000);
```

## Component Metadata

Components are entities - set metadata using standard APIs.

```ts
import { Component, Name } from "@rbxts/jecs";

world.set(Transform, Name, "Transform");
print(world.has(Transform, Component)); // true
```

## Quick Reference

| Operation        | Method                      |
| ---------------- | --------------------------- |
| Create world     | `Jecs.world()`              |
| Create entity    | `world.entity()`            |
| Create component | `world.component<T>()`      |
| Create tag       | `Jecs.tag()`                |
| Set data         | `world.set(e, comp, value)` |
| Add tag          | `world.add(e, tag)`         |
| Get data         | `world.get(e, comp)`        |
| Has component    | `world.has(e, comp...)`     |
| Remove           | `world.remove(e, comp)`     |
| Delete entity    | `world.delete(e)`           |
| Clear entity     | `world.clear(e)`            |

<!--
Source references:
- how_to/001_hello_world.luau
- how_to/002_entities.luau
- how_to/003_components.luau
- how_to/004_tags.luau
- how_to/005_entity_singletons.luau
- how_to/010_how_components_works.luau
-->
