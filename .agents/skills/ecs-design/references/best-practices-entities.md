---
name: best-practices-entities
description:
    Use when deciding what should be an entity, when entity counts cause
    performance issues, or when scaling to high object counts in jecs.
---

# Entity Design Best Practices

## The Core Question

Before creating an entity, ask:

> "Does this thing need per-instance state that changes over time?"

If **yes** → create an entity with components for that state.

If **no** → consider alternatives (instanced rendering, type lookups, Roblox
Instances).

## Lazy Entity Creation

Things can start as simple data and become entities later when they need
per-instance state.

**Example: Environmental objects**

A flower in the world might start as just visual decoration—a mesh placed by
terrain generation. No entity needed.

When the player interacts with it (starts harvesting), NOW create an entity to
track harvest progress:

```typescript
// Flower starts as just a mesh in the world (no entity)
// When interaction begins:
const flowerEntity = world.entity();
world.set(flowerEntity, FlowerType, "sunflower");
world.set(flowerEntity, HarvestProgress, 0);
world.set(flowerEntity, Transform, clickedPosition);
```

When harvesting completes, delete the entity and remove the mesh.

## When NOT to Use Entities

### Static environmental detail

Grass, rocks, trees that never change state don't need entities. Use:

- Roblox Terrain
- Instanced meshes
- Pre-baked Models

### Pooled visual effects

Particles, bullet tracers, impact effects—use Roblox's ParticleEmitter or a
custom instanced renderer, not ECS entities.

### UI elements

Roblox's UI system handles this. Don't create entities for buttons and labels.

## When to Use Entities

- **Changing state** — NPCs, items, projectiles, interactables with progress
- **Query targets** — "find all X near Y", "process all X each frame"
- **Relationships** — parent-child, ownership, targeting graphs
- **Abstract concepts** — formations, quests, teams, spawn points (entities need
  not be visible)

## High-Scale Pattern: Type + Instance State

For many similar objects (thousands of NPCs, crops, machines), separate shared
config from per-instance state:

```typescript
// Shared config lives in a lookup table (not per-entity)
const CropConfigs = new Map<
	CropTypeId,
	{
		growthStages: number;
		growthTimePerStage: number;
		harvestDrops: Array<ItemDrop>;
	}
>();

// Per-entity: only instance state
const CropType = world.component<CropTypeId>();
const GrowthStage = world.component<number>();
const LastGrowthTime = world.component<number>();
```

Systems look up shared config by type ID. Entities store only what varies
per-instance. This also reduces archetype fragmentation since entities share the
same component set.

## Prior Art: Vintage Story

Voxel games like Vintage Story scale to millions of blocks using this pattern:
most blocks are just a type ID at a position (no per-block entity). Only blocks
needing persistent state (furnaces, crops, chests) get a "BlockEntity."

## Roblox Considerations

Use ECS for game logic state. Use Roblox's native systems (Terrain,
ParticleEmitter, Instance hierarchy) for what they already handle efficiently.

## Checklist

Before creating an entity:

- [ ] Does this need per-instance state? If no → don't create entity
- [ ] Could this start without an entity and gain one later? → lazy creation
- [ ] Is this static environmental detail? → use Roblox Terrain/Instances
- [ ] Are there thousands of these? → separate shared config from instance state
- [ ] Does Roblox already handle this well? → use Roblox systems

<!--
Source references:
- https://vkguide.dev/docs/ascendant (Project Ascendant architecture)
- https://github.com/anegostudios/vssurvivalmod (Vintage Story patterns)
-->
