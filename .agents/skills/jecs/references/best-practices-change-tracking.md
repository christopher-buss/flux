---
name: best-practices-change-tracking
description: |
    Use when implementing change detection, dirty tracking, or delta updates in
    jecs
---

# Jecs Change Tracking

Patterns for detecting added, changed, and removed components.

## Previous Value Pattern

Store previous values as relationship pairs to detect changes.

```ts
import Jecs, { pair, Rest } from "@rbxts/jecs";

const world = Jecs.world();
const Position = world.component<Vector3>();
const Previous = Rest; // Built-in entity for "previous" pattern

// Cached queries for each state
const added = world.query(Position).without(pair(Previous, Position)).cached();

const changed = world.query(Position, pair(Previous, Position)).cached();

const removed = world.query(pair(Previous, Position)).without(Position).cached();
```

## Processing Changes

```ts
// Process newly added
for (const [entity, position] of added) {
	print(`Added ${entity}: ${position}`);
	world.set(entity, pair(Previous, Position), position);
}

// Process changed (compare values)
for (const [entity, current, previous] of changed) {
	if (current !== previous) {
		// or deep compare
		print(`Changed ${entity}: ${previous} -> ${current}`);
		world.set(entity, pair(Previous, Position), current);
	}
}

// Process removed
for (const [entity] of removed.iter()) {
	print(`Removed from ${entity}`);
	world.remove(entity, pair(Previous, Position));
}
```

## Signal-Based Tracking

Use signals for immediate notification. See
[feature-signals](./feature-signals.md) for full signal API details.

```ts
interface ChangeRecord<T> {
	added: Map<Entity, T>;
	changed: Map<Entity, T>;
	removed: Set<Entity>;
}

function trackComponent<T>(component: Entity<T>): ChangeRecord<T> {
	const record = {
		added: new Map(),
		changed: new Map(),
		removed: new Set(),
	} satisfies ChangeRecord<T>;

	world.added(component, (entity, _, value) => {
		record.added.set(entity, value);
	});

	world.changed(component, (entity, _, value) => {
		record.changed.set(entity, value);
	});

	world.removed(component, (entity) => {
		record.removed.add(entity);
	});

	return record;
}

// Usage
const positionChanges = trackComponent(Position);

// After frame, process and clear
function flushChanges(): void {
	for (const [entity, value] of positionChanges.added) {
		// Handle added
	}

	positionChanges.added.clear();
	positionChanges.changed.clear();
	positionChanges.removed.clear();
}
```

## Networking Delta Sync

Combine signals with batched sending:

```ts
const Networked = Jecs.tag();
const storages = new Map<Entity, Map<Entity, unknown>>();

// Setup tracking for all networked components
for (const component of world.each(Networked)) {
	const storage = new Map<Entity, unknown>();
	storages.set(component, storage);

	world.added(component, (entity, _, value) => {
		storage.set(entity, value);
	});

	world.changed(component, (entity, _, value) => {
		storage.set(entity, value);
	});

	world.removed(component, (entity) => {
		storage.set(entity, "REMOVED");
	});
}

// Send delta each frame
function sendDelta(): void {
	const delta = {} satisfies Record<string, unknown>;

	for (const [component, storage] of storages) {
		if (storage.size() > 0) {
			delta[tostring(component)] = storage;
			storage.clear();
		}
	}

	if (next(delta)[0] !== undefined) {
		remotes.replication.FireAllClients(delta);
	}
}
```

## Dirty Flag Pattern

Simple boolean tracking:

```ts
const Dirty = Jecs.tag();
const Position = world.component<Vector3>();

// Mark dirty on change
world.set(Position, OnChange, (entity) => {
	world.add(entity, Dirty);
});

// Process dirty entities
const dirtyQuery = world.query(Position).with(Dirty).cached();

function processDirty(): void {
	for (const [entity, position] of dirtyQuery) {
		syncToNetwork(entity, position);
		world.remove(entity, Dirty);
	}
}
```

## Comparison Methods

| Method         | Pros                          | Cons                          |
| -------------- | ----------------------------- | ----------------------------- |
| Previous pairs | Query-based, batch processing | Extra storage, manual sync    |
| Signals        | Immediate, no polling         | Memory for callbacks          |
| Dirty flag     | Simple, query-friendly        | Boolean only, no old value    |
| Hooks          | Single handler, fast          | Can't have multiple listeners |

## When to Use Each Method

- **Previous pairs** work well when changes are frequent. The diffing cost is
  spread across batch processing and you get access to old values.
- **Signals** (`world.changed`) are better when changes are infrequent and
  diffing becomes your bottleneck. They fire immediately on change.

## Best Practices

1. **Use Previous pairs** for frame-by-frame systems needing old values
2. **Use Signals** for multiple subscribers or immediate reaction
3. **Use Dirty flags** for simple "needs update" tracking
4. **Batch changes** - don't process every signal immediately
5. **Clear tracking state** at end of frame to prevent accumulation

<!--
Source references:
- examples/queries/changetracking.luau
- examples/networking/networking_send.luau
-->
