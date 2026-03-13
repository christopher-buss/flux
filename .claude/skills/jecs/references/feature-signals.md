---
name: feature-signals
description: |
    Use when external systems need to observe component changes in jecs.
    Supports multiple listeners and disconnect. For component
    constructors/destructors, use hooks instead.
---

# Jecs Signals

Signals are **event subscriptions** for external observers. Unlike hooks (which
are constructors/destructors), signals support multiple listeners and can be
disconnected.

## Signal Types

| Signal    | Triggers When           | Signature                        |
| --------- | ----------------------- | -------------------------------- |
| `added`   | Component added         | `(entity, id, value) => void`    |
| `changed` | Component value changed | `(entity, id, value) => void`    |
| `removed` | Component removed       | `(entity, id, deleted?) => void` |

## Basic Usage

```ts
const Position = world.component<Vector3>();

// Subscribe - returns disconnect function
const disconnect = world.added(Position, (entity, id, value) => {
	print(`Position added to ${entity}: ${value}`);
});

// Later: unsubscribe
disconnect();
```

## Multiple Listeners

```ts
const Health = world.component<number>();

// UI listener
const disconnectUI = world.changed(Health, (entity, id, value) => {
	updateHealthBar(entity, value);
});

// Sound listener
const disconnectSFX = world.changed(Health, (entity, id, value) => {
	playDamageSound();
});

// Remove individual listeners
disconnectUI();
```

## Signals for Pairs

Signals work with relationship pairs - receive full pair ID.

```ts
import { pair_second } from "@rbxts/jecs";

const Owns = world.component<number>();

// Listen to any ownership changes
world.added(Owns, (entity, id, value) => {
	const target = pair_second(world, id);
	print(`${entity} now owns ${target}`);
});
```

## Removed Signal

The `removed` signal receives a `deleted` flag like hooks.

```ts
world.removed(Health, (entity, id, deleted) => {
	if (deleted) {
		// Entity being deleted
		return;
	}

	// Component removed normally
	cleanupHealthEffects(entity);
});
```

## Signals vs Hooks

**Signals are event subscriptions.** External systems observe component changes.

**Hooks are constructors/destructors.** They define how a component itself
initializes and cleans up.

| Feature       | Signals                 | Hooks                        |
| ------------- | ----------------------- | ---------------------------- |
| Mental model  | Event subscription      | Constructor/Destructor       |
| Belongs to    | External observers      | The component itself         |
| Per component | Multiple                | One (intentional)            |
| Disconnect    | Yes                     | No                           |
| Set via       | `world.added(comp, fn)` | `world.set(comp, OnAdd, fn)` |

**Use signals when:** "Other systems need to know about this component"

- UI updates when Health changes
- Networking replicates component state
- Audio plays sound on damage

**Use hooks when:** "This component always does X on add/remove"

- Model destroys its Instance on removal
- Transform syncs to a BasePart on change

Signals can do everything hooks do. Use signals by default. Use hooks when you
need the slight performance gain and know you'll only ever have one listener.

## Quick Reference

```ts
// Subscribe
const disconnect1 = world.added(Component, fn);
const disconnect2 = world.changed(Component, fn);
const disconnect3 = world.removed(Component, fn);

// Unsubscribe
disconnect1();
disconnect2();
disconnect3();
```

<!--
Source references:
- src/jecs.d.ts (World.added, World.changed, World.removed)
- examples/networking/networking_send.luau
-->
