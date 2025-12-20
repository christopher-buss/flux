# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
the core package.

## Commands

- `pnpm build` - Transpile TypeScript to Luau using rbxtsc (tsconfig.lib.json)
- `pnpm dev:build` - Build with test files included (tsconfig.spec.json)
- `pnpm dev:watch` - Watch mode for development
- `pnpm clean` - Remove out/ and dist/ directories
- `pnpm typecheck` - Type check package

## Type System Architecture

Uses TypeScript mapped types extensively for compile-time type safety:

- `BindingsConfig` - User-defined action→input mappings
- `ButtonActions<T>`, `Axis1dActions<T>`, `Axis2dActions<T>` - Extract action
  names by type from config
- `ActionStateData<T>` - Type-safe methods constrain which actions work with
  which query methods

Example:

```typescript
// Config defines available actions and their types
const config = {
	jump: { type: "button" /* ... */ },
	move: { type: "axis2d" /* ... */ },
};

// Type system ensures:
actionState.pressed("jump"); // ✓ Valid - jump is ButtonAction
actionState.pressed("move"); // ✗ Error - move is not ButtonAction
actionState.axis2d("move"); // ✓ Valid - move is Axis2dAction
```

## Core Concepts

**Contexts**: Group actions with priority for state switching (e.g.,
gameplay→UI→driving). Higher priority contexts can "sink" input to prevent lower
priority contexts from receiving it.

**Triggers**: Allow complex input patterns beyond raw state:

- `implicit` - All must pass for action to trigger
- `explicit` - Any one passing triggers action
- `blocker` - Prevents action if triggered

Example: Hold trigger requires button held for threshold duration before firing.

**ActionState Component**: ECS component attached to entities. Query methods:

- State: `pressed()`, `justPressed()`, `justReleased()` (buttons only)
- Axes: `axis1d()`, `axis2d()`, `axisBecameActive()`, `axisBecameInactive()`
- Triggers: `triggered()`, `ongoing()`, `canceled()`, `currentDuration()`
- Claiming: `claim()`, `isClaimed()` - Exclusive consumption of actions

**Network Replication**:

- Auto mode: `system()` flushes diffs via `onDiffs` callback
- Manual mode: Call `flushDiffs()` for custom batching
- Server: `applyDiff()` to apply client inputs

**Transport Modes**:

- `auto` - Detect based on Workspace.UseFixedSimulation
- `native` - Server authority ON (uses IAS + BindToSimulation)
- `remote` - Server authority OFF (uses ActionDiff + RemoteEvents)

## Important Constraints

**InputContexts Ownership**: InputContext instances MUST be descendants of
Player instance in DataModel for Roblox network ownership. See server authority
docs.

**Context Priority**: Lower numbers = lower priority. UI contexts typically use
high priority + sink to block gameplay input.

**Shared Bindings**: Same key can map to different actions in different contexts
(e.g., ButtonR2 = "accelerate" in driving, "attack" in gameplay). Only active
context receives input.

## Build Pipeline

1. TypeScript → Luau via roblox-ts (`rbxtsc`)
2. Output: `dist/init.luau` + type definitions

## Dependencies

- `@rbxts/jecs` - ECS framework (Entity Component System)
- `@rbxts/services` - Roblox service wrappers
