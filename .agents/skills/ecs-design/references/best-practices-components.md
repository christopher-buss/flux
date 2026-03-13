---
name: best-practices-components
description:
    Use when deciding component granularity, whether to split or combine data,
    or designing component structures for jecs.
---

# Component Design Best Practices

## The Fundamental Question

For every piece of data, ask:

> "Is there a system that needs A but not B?"

If **yes** → separate components. If **no** → same component.

## Atomic Components

"Atomic" means indivisible for your use case, not smallest possible.

### Transform is atomic

```typescript
// WRONG: Over-split
const PositionX = world.component<number>();
const PositionY = world.component<number>();
const Rotation = world.component<Vector3>();

// RIGHT: Transform is one concept
const Transform = world.component<CFrame>();
```

No system needs position without rotation. They form one semantic unit.

### Character data is NOT atomic

```typescript
// WRONG: Under-split
interface Character {
	name: string;
	health: number;
	transform: CFrame;
	velocity: Vector3;
}

// RIGHT: Split by access pattern
const Transform = world.component<CFrame>();
const Velocity = world.component<Vector3>();
const Health = world.component<number>();
const DisplayName = world.component<string>();
```

Movement system needs transform/velocity. Health system needs health. UI system
needs display name. Different access patterns = different components.

## Semantic Grouping

Group data that represents one concept:

```typescript
// Health split: not all damageable entities need MaxHealth
const Health = world.component<number>(); // Current HP, required for damage
const MaxHealth = world.component<number>(); // Optional: for regen, UI, etc.

// or
const Health = world.component<number>();
const Max = world.component();
const MaxHealth = pair(Max, Health); // Tag to indicate MaxHealth exists

// Transform as one concept
const Transform = world.component<CFrame>();

// Damage event as one concept
const DamageEvent = world.component<{
	amount: number;
	source: Entity;
	type: DamageType;
}>();
```

## Change Rate Separation

Separate data that changes at different rates:

```typescript
// Changes every frame
const Transform = world.component<CFrame>();
const Velocity = world.component<Vector3>();

// Changes occasionally
const Health = world.component<number>();
const Mana = world.component<number>();

// Changes rarely/never
const MaxHealth = world.component<number>(); // Set at spawn
const DisplayName = world.component<string>(); // Never changes
const Team = world.component<TeamId>(); // Rarely changes
```

Why? Separating by change rate often aligns with access patterns—systems
processing movement don't need display names. This improves query specificity.

## Optional vs Required Data

Not all entities need all data. Use component presence to indicate capability:

```typescript
// Only entities that can move have velocity
const Velocity = world.component<Vector3>();

// Only entities that can be damaged have health
const Health = world.component<number>();

// Only entities that are rendered have a model
const Model = world.component<Instance>();
```

Query automatically filters:

```typescript
// Only processes entities that CAN move
for (const [entityId, transform, velocity] of world.query(Transform, Velocity)) {
	// ...
}
```

## Tags vs Data Components

**Tags:** Components with no data, presence indicates state/category.

```typescript
// Tags for classification
const IsPlayer = world.component(); // No type = tag
const IsEnemy = world.component();
const IsProjectile = world.component();

// Usage
world.add(entity, IsPlayer);
world.query(Health).with(IsEnemy); // All enemies with health
```

**Key insight: Tags themselves cost nothing. The archetype transition does.**

Adding/removing any component (tag or not) triggers an archetype transition:

- Jecs iterates through all existing components
- Each component reference gets reassigned to the new archetype
- Bookkeeping updates entity indices and keeps arrays packed

This is pointer shuffling, not deep copying, but the loop overhead adds up at
scale.

**For most entities:** Tag transitions are negligible.

**For hot paths (thousands/frame):** Consider whether you need the transition.

```typescript
// FINE: Infrequent state changes
const IsStunned = world.component();
world.add(entity, IsStunned);

// CONSIDER: High-frequency state changes in performance-critical code
const CombatState = world.component<{ stunned: boolean }>();
world.set(entity, CombatState, { stunned: true }); // In-place, no transition
```

**Rule of thumb:** Profile before optimizing transitions.

**When to prefer data over tags:** When entities have many components AND state
changes frequently during gameplay. Also when you have many mutually exclusive
states (idle/walking/running/jumping) - use a single data component.

## Complex Data in Components

Components can hold complex data. Don't over-flatten:

```typescript
// Fine: Arrays when they're accessed as a unit
const Waypoints = world.component<Array<Vector3>>();
const Abilities = world.component<Array<AbilityId>>();

// Fine: Nested structures when they're one concept
const Stats = world.component<{
	dexterity: number;
	intelligence: number;
	strength: number;
}>();
```

**When to externalize:**

- Items that need individual queries → separate entities with relationships
- Data shared across entities → separate entity, reference by ID

### Handle Pattern

Store references to external systems rather than duplicating data:

```typescript
// Handles to Roblox-managed resources
const Model = world.component<Model>();
const Animation = world.component<AnimationTrack>();

// Handles to external systems
const NavAgentId = world.component<number>(); // Pathfinding system
const PhysicsBodyId = world.component<number>(); // Physics simulation
```

For transform hierarchies specifically, Roblox's Instance hierarchy already
handles parent-child relationships efficiently. Store a Model handle and let
Roblox manage the spatial hierarchy rather than reimplementing it in ECS.

## Entity Members vs Relationships

Storing entity IDs in components (called "entity members") is a key pattern:

```typescript
// Entity members - store entity reference as component data
const Target = world.component<Entity>();
const Parent = world.component<Entity>();
const LastAttacker = world.component<Entity>();

// Usage
world.set(attacker, Target, enemy); // No fragmentation
const target = world.get(attacker, Target);
```

**Entity members** — Use when:

- Forward lookup only ("who does X target?")
- Many unique targets (avoids fragmentation)
- Link changes frequently
- No auto-cleanup needed

**Relationships** — Use when:

- Need reverse lookup ("who targets X?")
- Want grouping by target
- Want auto-cleanup on target deletion
- Few unique targets

```typescript
// Entity member: attacker → target (forward only)
const AttackTarget = world.component<Entity>();
world.set(attacker, AttackTarget, enemy);

// Relationship: query all children of a parent (reverse lookup)
world.add(child, pair(ChildOf, parent));
for (const [id] of world.query(Transform).with(pair(ChildOf, parent))) {
	// All children of this parent
}
```

### Using Both Together

These patterns aren't mutually exclusive. For composed entities (a car with
hull, motor, wheels), use **both**:

```typescript
// ChildOf for lifecycle: deletion cascades, serialization
world.add(hull, pair(ChildOf, car));
world.add(motor, pair(ChildOf, car));
world.add(wheel1, pair(ChildOf, car));

// Entity members for operational access: direct lookup in systems
const CarParts = world.component<{
	hull: Entity;
	motor: Entity;
	wheels: [Entity, Entity, Entity, Entity];
}>();
world.set(car, CarParts, {
	hull,
	motor,
	wheels: [wheel1, wheel2, wheel3, wheel4],
});
```

ChildOf gives you generic operations (delete car → children deleted). Entity
members give you direct access without queries.

**Replication note:** Entity members require extra work to replicate - you must
track which component fields contain entity IDs and remap them. Relationships
are easier to detect via `jecs.IS_PAIR`.

## Common Mistakes

### Mistake: God component

```typescript
// BAD: Everything in one component
interface Entity {
	buffs: Array<Buff>;
	equipment: Equipment;
	health: number;
	inventory: Array<Item>;
	mana: number;
	transform: CFrame;
	velocity: Vector3;
	// ... 20 more fields
}
```

**Fix:** Split by access pattern and change rate.

### Mistake: Primitive explosion

```typescript
// BAD: Every field is a component
const HealthCurrent = world.component<number>();
const HealthMax = world.component<number>();
const HealthRegeneration = world.component<number>();
const ManaPool = world.component<number>();
const ManaMax = world.component<number>();
// 50+ components for one entity type
```

**Fix:** Group semantically related data.

### Mistake: Inheritance thinking

```typescript
// BAD: Trying to model inheritance
interface BaseCharacter {
	transform: CFrame;
}
interface Enemy extends BaseCharacter {
	aiState: AIState;
}
interface Player extends BaseCharacter {
	inventory: Array<Item>;
}
```

**Fix:** Composition. All characters have Transform. Players also have
Inventory. Enemies also have AIState. No inheritance needed.

### Mistake: Enums as separate components

```typescript
// BAD: One component per state
const StateIdle = world.component();
const StateWalking = world.component();
const StateRunning = world.component();
const StateJumping = world.component();
```

**Fix:** One component with enum value.

```typescript
type State = "idle" | "jumping" | "running" | "walking";
const CharacterState = world.component<State>();
```

## Checklist

Before finalizing a component:

- [ ] Can any system use only part of this data? → Split
- [ ] Does this data always change together? → Keep together
- [ ] Is this data optional for some entities? → Separate component
- [ ] Do I need reverse lookup for this entity reference? → Relationship
- [ ] Am I splitting just because it's "more atomic"? → Stop

<!--
Source references:
- https://github.com/SanderMertens/flecs/blob/master/docs/DesignWithFlecs.md#components
- https://github.com/SanderMertens/ecs-faq#how-do-i-design-for-ecs
-->
