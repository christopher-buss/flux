---
name: core-database-model
description:
    Use when thinking about jecs data modeling, component relationships, or
    query patterns. Provides the columnar database mental model for ECS design.
---

# ECS as a Columnar Database

Think of ECS as a columnar database optimized for batch processing.

## The Mapping

| Database Concept | ECS Equivalent                | Example                                 |
| ---------------- | ----------------------------- | --------------------------------------- |
| Table            | Archetype                     | All entities with [Transform, Velocity] |
| Column           | Component                     | Transform, Velocity, Health             |
| Row              | Entity                        | Player, Enemy, Bullet                   |
| Primary Key      | Entity ID                     | Unique entity identifier                |
| Foreign Key      | Entity reference in component | `target: Entity`                        |
| Index            | Query cache                   | Cached query for [Transform, Velocity]  |
| View             | Query with filters            | Query with `with`/`without`             |
| Stored Procedure | System                        | MovementSystem, DamageSystem            |

## Why Columnar?

Traditional databases store data row-by-row (row-oriented):

```text
Row 1: [pos_x, pos_y, pos_z, vel_x, vel_y, vel_z, health, name...]
Row 2: [pos_x, pos_y, pos_z, vel_x, vel_y, vel_z, health, name...]
Row 3: [pos_x, pos_y, pos_z, vel_x, vel_y, vel_z, health, name...]
```

Columnar databases store data column-by-column:

```text
Transform column: [tf1, tf2, tf3, tf4, tf5...]
Velocity column:  [vel1, vel2, vel3, vel4, vel5...]
Health column:    [hp1,  hp2,  hp3,  hp4,  hp5... ]
```

**Why this matters for jecs:**

- Movement system only needs Transform + Velocity columns
- Loads exactly what it needs, nothing else
- Jecs handles efficient storage internally
- Queries iterate only matching archetypes

## Thinking in Queries

Before designing components, think about the queries (systems) that will use
them.

**Question:**

- What data does my movement system need?

**Answer:**

- Transform to update, Velocity to read. Nothing else.

**Question:**

- What data does my damage system need?

**Answer:**

- Health to modify, maybe Armor to check. Not Transform.

If two systems need different subsets of data, those subsets should be separate
components. This is **normalization** applied to games.

## Normalization for ECS

Database normalization principles apply:

### First Normal Form (1NF): Atomic values

Each component field should be a single value, not a collection that needs
iteration.

```typescript
// Violates 1NF: System must iterate nested array
const Inventory = world.component<{ items: Array<Item> }>();

// Better: Items as separate entities with relationship
world.add(sword, pair(InInventory, player));
world.add(shield, pair(InInventory, player));
// Query: world.query(Item).with(pair(InInventory, player))
```

### Second Normal Form (2NF): No partial dependencies

Every field in a component should depend on the entire component's purpose.

```typescript
// Violates 2NF: team doesn't change with transform
interface Character {
	team: TeamId; // Partial dependency - doesn't relate to spatial data
	transform: CFrame;
}

// Better: Separate concerns
const Transform = world.component<CFrame>();
const Team = world.component<TeamId>();
```

### Third Normal Form (3NF): No transitive dependencies

Don't store data that can be derived from other data.

```typescript
// Violates 3NF: speed is derived from velocity
interface Movement {
	speed: number; // = velocity.Magnitude
	velocity: Vector3;
}

// Better: Compute when needed
const Velocity = world.component<Vector3>();
// speed = velocity.Magnitude in system
```

**Why this matters:**

Derived data can become stale. Every system that modifies `velocity` must also
update `speed`, or you have consistency bugs.

**When to denormalize (cache derived values):**

- Derived value is read MUCH more often than source changes
- Computation is expensive (sqrt, trig, hierarchy traversal)
- Classic example: `LocalTransform` → `GlobalTransform` (every engine caches
  this)

```typescript
// Acceptable denormalization: world transform hierarchy
const LocalTransform = world.component<CFrame>();
const GlobalTransform = world.component<CFrame>(); // Cached, propagated in bulk
```

Use dirty flags or dedicated propagation systems when caching derived data.

**Roblox note:** For transform hierarchies, Roblox's Instance system already
handles parent-child relationships and global transforms efficiently. Often
better to store a Model handle and let Roblox manage spatial hierarchy rather
than reimplementing it in ECS.

## Query Patterns as SQL

Thinking in SQL helps design better queries:

```sql
-- "All moving entities"
SELECT entity, transform, velocity FROM entities
WHERE HAS(Transform) AND HAS(Velocity)

-- "All enemies on red team"
SELECT entity, health FROM entities
WHERE HAS(Health) AND HAS(pair(TeamMember, RedTeam)) AND HAS(IsEnemy)

-- "All items in player's inventory"
SELECT entity, item_data FROM entities
WHERE HAS(ItemData) AND HAS(pair(InInventory, player1))
```

The ECS equivalent:

```typescript
// All moving entities
world.query(Transform, Velocity);

// All enemies on red team
world.query(Health).with(pair(TeamMember, RedTeam)).with(IsEnemy);

// All items in player's inventory
world.query(ItemData).with(pair(InInventory, player1));
```

## Table (Archetype) Design

Each unique combination of components creates a table (archetype).

### Understanding Fragmentation

Fragmentation = archetypes iterated / entities returned. It measures query
overhead, not total archetype count.

**Key insight:** You can have millions of archetypes with zero fragmentation if
your queries each match only one archetype. Fragmentation is per-query, not
global.

```typescript
// 1000 players, each with pair(InCell, cellN) = 1000 archetypes
// Query for specific cell = 1 archetype matched = zero fragmentation!
world.query(Transform).with(pair(InCell, cell42));

// Query for ALL transforms = 1000 archetypes = high fragmentation
world.query(Transform).with(pair(InCell, jecs.Wildcard));
```

### When Fragmentation Helps

Fragmentation from relationships enables efficient grouped queries:

```typescript
// Spatial partitioning: only render visible cells
for (const cellId of visibleCells) {
	for (const [entityId, transform, model] of world
		.query(Transform, Model)
		.with(pair(InCell, cellId))) {
		// Only entities in this cell - fast!
	}
}

// Scene graph: only children of this parent
for (const [entityId, transform] of world.query(Transform).with(pair(ChildOf, parentId))) {
	// Direct children only
}
```

### When to Avoid Fragmentation

Avoid relationships when you always query broadly:

```typescript
// BAD: Every entity has unique AttackedBy target
world.add(entity, pair(AttackedBy, attacker123));
// Query for "all attacked entities" iterates thousands of archetypes

// GOOD: Use entity member instead
const AttackedBy = world.component<Entity>();
world.set(entity, AttackedBy, attacker123);
// Single archetype for all attacked entities
```

**Rule of thumb:**

Fragmentation matters at thousands of archetypes in a single query. Profile
before optimizing.

## Joins in ECS

Unlike SQL, ECS doesn't have explicit JOINs. Related data access patterns:

**Pattern 1: Component reference**

```typescript
const Parent = world.component<Entity>();
// Access parent: world.get(parentEntity, Transform)
```

**Pattern 2: Relationship query**

```typescript
// Get all children of an entity
world.query(Transform).with(pair(ChildOf, parentEntity));
```

**Pattern 3: Cached children (denormalization)**

```typescript
// Parent caches children for O(1) access - duplicates ChildOf relationship info
const Children = world.component<Array<Entity>>();
// Requires manual sync when children added/removed
```

Choose based on access pattern:

- forward lookup (child→parent) → entity member or `world.target()`
- reverse lookup (parent→children) → relationship query or cached array if
  performance-critical.

## Design Checklist

When designing components, ask:

1. **What queries will use this data?** (drives component boundaries)
2. **Would this be one column or multiple in a database?** (1NF check)
3. **Does all this data change together?** (2NF check)
4. **Is any of this data derived?** (3NF check)
5. **How many unique archetypes will this create?** (fragmentation check)

<!--
Source references:
- https://github.com/SanderMertens/ecs-faq#what-is-ecs
- https://ajmmertens.medium.com/why-it-is-time-to-start-thinking-of-games-as-databases-e7971da33ac3
- https://github.com/SanderMertens/flecs/blob/master/docs/DesignWithFlecs.md
-->
