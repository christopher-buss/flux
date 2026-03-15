# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
the core package.

## Commands

- `pnpm build` - Transpile TypeScript to Luau using rbxtsc (tsconfig.lib.json)
- `pnpm dev:build` - Build with test files included (tsconfig.spec.json)
- `pnpm dev:watch` - Watch mode for development
- `pnpm clean` - Remove out/ and dist/ directories
- `pnpm typecheck` - Type check package

## API Reference

See `docs/core-api-proposal.md` for the full API design.

## Type System Architecture

Uses TypeScript mapped types for compile-time type safety. `ActionConfig` is
generic over `ActionType` so literal types propagate through the system.

- `ActionConfig<T>` - Action definition with type literal preserved
- `BoolActions<T>`, `Direction1dActions<T>`, `Direction2dActions<T>`,
  `Direction3dActions<T>`, `ViewportPositionActions<T>` - Extract action names by
  type from config
- `ActionState<T>` - Type-safe methods constrain which actions work with which
  query methods
- `ActionValue<T, A>` - Maps action name to correct return type

Example:

```typescript
const actions = defineActions({
	jump: action({ type: "Bool" }),
	move: action({ type: "Direction2D" }),
});

// Type system ensures:
actionState.pressed("jump"); // ✓ Valid - jump is BoolAction
actionState.pressed("move"); // ✗ Error - move is not BoolAction
actionState.direction2d("move"); // ✓ Valid - move is Direction2D
```

Cross-validation: `createCore` validates that context binding keys match action
names at compile time.

## Core Concepts

**Actions**: Defined via `defineActions` with Roblox-aligned types: `"Bool"`,
`"Direction1D"`, `"Direction2D"`, `"Direction3D"`, `"ViewportPosition"`.

**Contexts**: Group actions with priority for state switching (e.g.,
gameplay→UI→driving). Higher priority contexts can `sink` input to prevent lower
priority contexts from receiving it.

**Modifiers**: Stateless value transforms in the input pipeline. Receive typed
overloads (`number | Vector2 | Vector3`). Examples: `deadZone()`, `negate()`,
`scale()`.

**Triggers**: Stateful state gates layered on top of modifiers. Receive
post-modifier `magnitude: number` (bool→0/1, axis→vector length). Types:

- `implicit` - All must pass for action to trigger
- `explicit` - Any one passing triggers action
- `blocker` - Prevents action if triggered

Pipeline: raw input → modifiers → triggers → action state.

**InputHandle**: Opaque handle returned by `register()`. Core operates on
handles, not players/entities. ECS/React wrappers map handles to their concepts.

**ActionState**: Query interface for input state per handle. Methods constrained
by action type:

- Bool-only: `pressed()`, `justPressed()`, `justReleased()`
- Axis: `axis1d()`, `direction2d()`, `axis3d()`, `position2d()`
- Axis transitions: `axisBecameActive()`, `axisBecameInactive()`
- Triggers: `triggered()`, `ongoing()`, `canceled()`, `currentDuration()`
- Claiming: `claim()`, `isClaimed()` - Exclusive consumption of actions
- Generic: `getState()` - Returns typed value for any action

**Network Replication** (two orthogonal settings):

- `transport`: `"remote"` (RemoteEvents) or `"native"` (reserved for future
  server authority)
- `flush`: `"auto"` (flushed in `update()`) or `"manual"` (call `flushDiffs()`
  yourself)
- Server: `applyDiff()` to apply client inputs
- Only `remote` transport implemented initially

## Important Constraints

**InputContexts Ownership**: InputContext instances MUST be descendants of Player
instance in DataModel for Roblox network ownership.

**Context Priority**: Lower numbers = lower priority. UI contexts typically use
high priority + sink to block gameplay input.

**Shared Bindings**: Same key can map to different actions in different contexts
(e.g., ButtonR2 = "accelerate" in driving, "attack" in gameplay). Only active
context receives input.

**Core is ECS-agnostic**: Core uses opaque `InputHandle`s. JECS integration is a
separate wrapper layer that maps entities ↔ handles.

## Build Pipeline

1. TypeScript → Luau via roblox-ts (`rbxtsc`)
2. Output: `dist/init.luau` + type definitions

## Dependencies

- `@rbxts/services` - Roblox service wrappers
