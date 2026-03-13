---
name: best-practices-systems
description:
    Use when designing jecs systems, deciding system scope, or structuring game
    logic in Roblox.
---

# System Design Best Practices

## Systems Are for Reusable Behavior

Systems handle **generalizable behavior patterns** that apply across many entity
types. One-off logic belongs in helper functions.

```typescript
// GOOD: Reusable system - works for players, NPCs, projectiles, etc.
function movementSystem(): void {
	for (const [entityId, transform, velocity] of world.query(Transform, Velocity)) {
		transform.add(velocity.mul(dt));
	}
}

// GOOD: Helper function for one-off spawning logic
function spawnPlayerCharacter(player: Player): Entity {
	const entityId = world.entity();
	world.set(entityId, Transform, player.SpawnLocation);
	world.set(entityId, Model, createCharacterModel());
	world.add(entityId, pair(OwnedBy, player));
	return entityId;
}
```

```typescript
// BAD: God system with mixed concerns
function physicsSystem(): void {
	// Applies gravity
	// Updates positions
	// Checks collisions
	// Resolves collisions
	// 500 lines of mixed concerns
}

// BAD: System for one-off behavior that won't be reused
function spawnPlayerCharacterSystem(): void {
	// Only ever spawns player characters
	// Better as a helper function
}
```

**When to make a system vs helper function:**

| Make a System When...                   | Use a Helper Function When...           |
| --------------------------------------- | --------------------------------------- |
| Behavior applies to many entity types   | Logic is specific to one situation      |
| You'll query and process batches        | You know exactly which entity to act on |
| The logic runs every frame or regularly | It's called once (spawning, setup)      |
| You want it in the scheduler pipeline   | Order doesn't matter                    |

**Benefits of well-designed systems:**

- Reusable across entity types (players, NPCs, projectiles)
- Easy to disable for testing
- Easy to reorder in the pipeline
- Fewer systems with good component design (20-100 is typical)

## Query Once, Process Many

Systems process batches, not individuals:

```typescript
// BAD: Single-entity thinking
function applyDamage(entity: Entity, amount: number): void {
	const health = world.get(entity, Health);
	world.set(entity, Health, health - amount);
}

// GOOD: Batch processing
function damageSystem(): void {
	for (const [entityId, health, damage] of world.query(Health, PendingDamage)) {
		world.set(entityId, Health, health - damage.amount);
		world.remove(entityId, PendingDamage);
	}
}
// Called individually for each damage event
```

## Avoid Work

The fastest code is code that doesn't run:

### Use query filters

```typescript
// BAD: Query all, filter in code
for (const [entityId, transform] of world.query(Transform)) {
	if (world.has(entityId, CanMove) && !world.has(entityId, Frozen)) {
		// move
	}
}

// GOOD: Filter in query
for (const [entityId, transform] of world.query(Transform).with(CanMove).without(Frozen)) {
	// move
}
```

### Use change detection

Track changes using a `Previous` pair component:

```typescript
// BAD: Update every frame even if unchanged
for (const [entityId, transform, model] of world.query(Transform, Model)) {
	model.CFrame = transform; // Expensive even if transform didn't change
}

// GOOD: Only process changed entities using Previous pair
for (const [entityId, transform, previousTransform, model] of world.query(
	Transform,
	pair(Previous, Transform),
	Model,
)) {
	if (transform !== previousTransform) {
		model.CFrame = transform;
		world.set(entityId, pair(Previous, Transform), transform);
	}
}

// Initialize Previous when entity is added (separate system)
for (const [entityId, transform] of world.query(Transform).without(pair(Previous, Transform))) {
	world.set(entityId, pair(Previous, Transform), transform);
}
```

### Use spatial partitioning

```typescript
// BAD: Check every entity pair
for (const [entityId1, position1] of query1) {
	for (const [entityId2, position2] of query2) {
		if (distance(position1, position2) < range) {
			// O(n²) comparisons
		}
	}
}

// GOOD: Use world cells or spatial hash
for (const [entityId1, position1, cell1] of query1) {
	for (const [entityId2, position2] of query2.with(pair(InCell, cell1.id))) {
		// Only check entities in same/adjacent cells
	}
}
```

## System Ordering

Systems run in a defined order. Think about dependencies:

```text
Input → Physics → Collision → Damage → Death → Cleanup → Render
```

Common phase pattern:

| Phase      | Purpose              | Example Systems                 |
| ---------- | -------------------- | ------------------------------- |
| Input      | Read player/AI input | InputSystem, AIDecisionSystem   |
| PreUpdate  | Prepare frame        | ResetFlagsSystem, SpawnSystem   |
| Update     | Main game logic      | MovementSystem, CombatSystem    |
| PostUpdate | React to changes     | DamageSystem, DeathSystem       |
| PreRender  | Prepare visuals      | AnimationSystem, TransformSync  |
| Render     | Draw                 | RenderSystem                    |
| Cleanup    | End of frame         | DespawnSystem, EventClearSystem |

## Data Flow

Systems communicate through components, not function calls. Events work best as
**separate entities** that reference their targets:

```typescript
// GOOD: Event as separate entity (preferred pattern)
// Helper function creates event entity
function dealDamage(source: Entity, target: Entity, amount: number): Entity {
	const entityId = world.entity();
	world.set(entityId, Hit, { amount, source, target });
	return entityId;
}

// CombatSystem creates hit events
dealDamage(attacker, victim, 50);

// DamageSystem processes all hits (runs later)
for (const [entityId, hit] of world.query(Hit)) {
	const health = world.get(hit.target, Health);
	if (health) {
		world.set(hit.target, Health, health - hit.amount);
	}
}

// Benefits: Other systems can intercept/modify/log hits independently
```

```typescript
// OKAY: Event as component on target (simpler but less flexible)
world.set(target, PendingDamage, { amount: 50, source: attacker });

// BAD: Direct function call
damageSystem.applyDamage(target, 50); // Tight coupling
```

## Stateless Systems

Systems should not store state. Use components:

```typescript
// BAD: State in system
let lastFrameTime = 0;
function movementSystem(): void {
	const dt = now - lastFrameTime;
	lastFrameTime = now;
	// ...
}

// GOOD: State in component/world
const frameData = world.component<{ dt: number; time: number }>();
// Set by a timing system, read by others
```

## No Yielding in Systems

Systems must never yield. The scheduler runs systems synchronously in sequence -
yielding blocks all subsequent systems.

```typescript
// BAD: Yields in system - blocks everything!
function pathfindingSystem(): void {
	for (const [entityId, target] of world.query(Target)) {
		const path = PathfindingService.ComputeAsync(/* ... */); // YIELDS!
	}
}

// GOOD: Spawn thread for async work
function pathfindingSystem(): void {
	for (const [entityId, target] of world.query(Target).without(ComputingPath)) {
		world.add(entityId, ComputingPath);
		task.spawn(() => {
			const path = PathfindingService.ComputeAsync(/* ... */);
			world.set(entityId, Path, path);
			world.remove(entityId, ComputingPath);
		});
	}
}
```

Common yielding APIs to watch for: `task.wait()`, DataStore calls, any function
marked `async`.

## Iterator Invalidation

Structural changes (adding/removing components, deleting entities) during
iteration can cause issues. Mark entities for later processing instead:

```typescript
// WARNING: May invalidate iterator
for (const [entityId, health] of world.query(Health)) {
	if (health <= 0) {
		world.delete(entityId); // Structural change during iteration!
	}
}

// SAFER: Mark for deletion, process in cleanup system
for (const [entityId, health] of world.query(Health).without(Destroy)) {
	if (health <= 0) {
		world.add(entityId, Destroy);
	}
}

// Cleanup system runs at end of frame
for (const [entityId] of world.query(Destroy)) {
	world.delete(entityId);
}
```

## Common System Patterns

### Event processing

```typescript
// Events as entities with limited lifetime
const Hit = world.component<{
	amount: number;
	source: Entity;
	target: Entity;
}>();

// Helper function to create event
function dealDamage(source: Entity, target: Entity, amount: number): Entity {
	const entityId = world.entity();
	world.set(entityId, Hit, { amount, source, target });
	return entityId;
}

// Process events in system
for (const [entityId, hit] of world.query(Hit).without(Destroy)) {
	const health = world.get(hit.target, Health);
	if (health) {
		world.set(hit.target, Health, health - hit.amount);
	}

	world.add(entityId, Destroy);
}

// Cleanup system runs at end of frame
for (const [entityId] of world.query(Destroy)) {
	world.delete(entityId);
}
```

## Query Caching

**Critical rule:** Never call `.cached()` inside a system. Create cached queries
at module scope.

```typescript
// WRONG: Creates new cache every frame!
function movementSystem(dt: number): void {
	for (const [entityId, transform, velocity] of world.query(Transform, Velocity).cached()) {
		// New cache created every call
	}
}

// RIGHT: Cache created once at module load
const moveQuery = world.query(Transform, Velocity).cached();

function movementSystem(dt: number): void {
	for (const [entityId, transform, velocity] of moveQuery) {
		// Reuses existing cache
	}
}
```

Cached queries track matching archetypes. Creating them inside systems means
rebuilding this tracking every frame, defeating the purpose.

## Checklist

Before finalizing a system:

- [ ] Is this behavior **reusable** across entity types? (If not, use a helper
      function)
- [ ] Does it use query filters instead of code filters?
- [ ] Is the query cached **at module scope** (for frequent queries)?
- [ ] Does the system **avoid yielding**?
- [ ] Does it **avoid structural changes** during iteration? (Use marker
      components)
- [ ] Is all state in components, not the system?
- [ ] Are events handled via component entities?

<!--
Source references:
- https://github.com/SanderMertens/flecs/blob/master/docs/DesignWithFlecs.md#systems
- https://github.com/SanderMertens/ecs-faq#system
-->
