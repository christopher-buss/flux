---
name: feature-hooks
description: |
    Use when defining component constructors/destructors with OnAdd, OnChange,
    OnRemove hooks in jecs. For external observers, use signals instead.
---

# Jecs Component Hooks

Hooks are **constructors and destructors** for components. They define how a
component initializes and cleans up. One hook per type per component, by design.

## Hook Types

| Hook       | Triggers When                       | Signature                        |
| ---------- | ----------------------------------- | -------------------------------- |
| `OnAdd`    | Component added with value          | `(entity, id, data) => void`     |
| `OnChange` | Existing component value changes    | `(entity, id, data) => void`     |
| `OnRemove` | Component removed or entity deleted | `(entity, id, deleted?) => void` |

### The `id` Parameter

The `id` parameter is the full component ID that triggered the hook:

- **Regular components:** Same as the component you registered on
- **Pairs/relationships:** The full pair (e.g., `pair(ChildOf, parent)`)

For pairs, use `pair_second(world, id)` to extract the target entity. See
[Hooks for Pairs](#hooks-for-pairs) for examples.

## Setting Up Hooks

```ts
import { Entity, Id, OnAdd, OnChange, OnRemove } from "@rbxts/jecs";

const Transform = world.component<CFrame>();

world.set(Transform, OnAdd, (entity: Entity, id: Id<CFrame>, data: CFrame) => {
	print(`Transform added to ${entity}`);
});

world.set(Transform, OnChange, (entity: Entity, id: Id<CFrame>, data: CFrame) => {
	print(`Transform changed on ${entity} to ${data}`);
});

world.set(Transform, OnRemove, (entity: Entity, id: Id<CFrame>, deleted?: true) => {
	if (deleted) {
		return; // Entity being deleted, skip cleanup
	}

	print(`Transform removed from ${entity}`);
});
```

## OnAdd

Fires after value is set. Receives the component ID and value.

```ts
const Health = world.component<number>();

world.set(Health, OnAdd, (entity, id, value) => {
	// Initialize related state
	print(`${entity} now has ${value} health`);
});

// Triggers hook
world.set(entity, Health, 100);
```

## OnChange

Fires when existing component value is updated (not on initial add).

```ts
world.set(Health, OnChange, (entity, id, value) => {
	print(`Health changed to ${value}`);
});

world.set(entity, Health, 100); // OnAdd (not OnChange)
world.set(entity, Health, 50); // OnChange fires
```

**Prefer `world.changed()` instead.** OnChange doesn't fit the
constructor/destructor model - observing mutations is typically an external
concern. Signals (`world.changed`) use hooks internally but allow multiple
listeners and disconnect. Using OnChange directly blocks signals from working on
that component.

## OnRemove

Fires when component is removed OR entity is deleted.

```ts
const Dead = world.component();

world.set(Health, OnRemove, (entity, id, deleted) => {
	if (deleted) {
		// Entity is being deleted - minimal cleanup only
		return;
	}

	// Normal removal - full cleanup
	world.remove(entity, Dead);
});
```

i **The `deleted` flag:**

- `true`: Entity being deleted (all components removed)
- `undefined`: Single component removed normally

## Structural Changes in Hooks

You CAN call `world.add`, `world.remove`, `world.set` in hooks with caveats:

```ts
world.set(Health, OnRemove, (entity, id, deleted) => {
	if (deleted) {
		return; // IMPORTANT: Skip during deletion
	}

	// Safe to make changes
	world.remove(entity, HealthBar);
});
```

**DEBUG mode** (`Jecs.world(true)`) throws error if you make structural changes
when `deleted` is true.

## Hook Order with ChildOf

When parent deleted, children's OnRemove hooks fire first (if no cycles).

```ts
import { ChildOf, pair } from "@rbxts/jecs";

// Setup hierarchy
world.add(child, pair(ChildOf, parent));

// When parent deleted:
// 1. Child's OnRemove hooks fire
// 2. Parent's OnRemove hooks fire
world.delete(parent);
```

## Hooks for Pairs

Hooks on relationship receive the full pair ID.

```ts
import { pair_second } from "@rbxts/jecs";

world.set(ChildOf, OnAdd, (entity, id, _) => {
	const parentEntity = pair_second(world, id);
	print(`${entity} now child of ${parentEntity}`);
});
```

## Common Patterns

**Resource cleanup:**

```ts
const Model = world.component<Instance>();

world.set(Model, OnRemove, (entity, id, deleted) => {
	const model = world.get(entity, Model);
	model?.Destroy();
});
```

**Syncing state:**

```ts
const Position = world.component<Vector3>();
const Model = world.component<BasePart>();

world.set(Position, OnChange, (entity, id, position) => {
	const model = world.get(entity, Model);
	if (model) {
		model.CFrame = new CFrame(position);
	}
});
```

## Hooks vs Signals

**Hooks are constructors/destructors.** They define how a component initializes
and cleans up. One per component, by design.

**Signals are event subscriptions.** External systems observe component changes.
Multiple listeners, can disconnect.

| Feature       | Hooks                  | Signals            |
| ------------- | ---------------------- | ------------------ |
| Mental model  | Constructor/Destructor | Event subscription |
| Belongs to    | The component itself   | External observers |
| Per component | One (intentional)      | Multiple           |
| Disconnect    | No                     | Yes                |

**Use hooks when:** "This component always does X on add/remove"

- Model destroys its Instance on removal
- Transform syncs to a BasePart on change

**Use signals when:** "Other systems need to know about this component"

- UI updates when Health changes
- Networking replicates component state
- Audio plays sound on damage

Signals can do everything hooks do. Hooks are an optimization for the
single-listener, never-disconnect case.

See [feature-signals](feature-signals.md) for signal-based listeners.

<!--
Source references:
- how_to/110_hooks.luau
- examples/hooks/cleanup.luau
-->
