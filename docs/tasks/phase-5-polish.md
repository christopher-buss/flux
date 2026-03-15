# Phase 5: P2 Polish

## Project Overview

Flux is an Input Action System wrapper for Roblox built with roblox-ts. It wraps
Roblox's `InputAction`, `InputBinding`, and `InputContext` APIs with a
declarative authoring layer. The core package (`@rbxts/flux`) is ECS-agnostic,
operating on opaque `InputHandle`s (branded numbers). This is a roblox-ts
project -- no default exports, uses Roblox globals (`Vector2`, `Vector3`,
`Enum`, etc.).

**Pipeline**: raw input -> modifiers -> triggers -> ActionState

## Prerequisites

Phase 4 must be complete. All P0 and P1 features must be working:

- Action definition (`defineActions`, convenience wrappers)
- Context definition (`defineContexts`)
- Modifiers (`deadZone`, `negate`, `scale`)
- Triggers (`hold`, `tap`, `doubleTap`, `implicit`/`explicit`/`blocker`)
- Core runtime (`createCore`, `register`, `update`, `getState`, `unregister`)
- Rebinding + persistence (`rebind`, `rebindAll`, `serializeBindings`, etc.)
- Network replication (`flushDiffs`, `applyDiff`, auto/manual flush)
- Simulate action (`simulateAction`)

## Target File Structure

After this phase, new/modified files:

```text
packages/core/src/
  bindings/
    presets.ts                  # WASD, ARROWS, AD binding presets
    presets.spec.ts             # tests
  index.ts                      # final public API: named exports + Flux namespace
```

## Commands

All commands run from repo root:

```bash
pnpm typecheck          # type check all packages
pnpm build              # transpile TypeScript to Luau
pnpm dev:build          # build with test files included
pnpm test               # run jest-roblox tests
```

## Testing

Tests use jest-roblox. Import from `@rbxts/jest-globals`:

```ts
import { describe, expect, it } from "@rbxts/jest-globals";
```

Test files are `.spec.ts`, co-located with source files.

---

## Task 5.1: Binding Presets

### Task 5.1 What to Build

Create common keyboard layout presets as exported constants. These are optional
ergonomics -- developers can always specify keycodes directly.

#### File: `packages/core/src/bindings/presets.ts`

```ts
/**
 * WASD directional preset for Direction2D actions.
 * Maps to standard keyboard movement layout.
 */
export const WASD = {
	down: Enum.KeyCode.S,
	left: Enum.KeyCode.A,
	right: Enum.KeyCode.D,
	up: Enum.KeyCode.W,
} as const;

/**
 * Arrow keys directional preset for Direction2D actions.
 * Maps to arrow key movement layout.
 */
export const ARROWS = {
	down: Enum.KeyCode.Down,
	left: Enum.KeyCode.Left,
	right: Enum.KeyCode.Right,
	up: Enum.KeyCode.Up,
} as const;

/**
 * A/D axis preset for Direction1D actions.
 * Maps to standard keyboard left/right layout.
 */
export const AD = {
	negative: Enum.KeyCode.A,
	positive: Enum.KeyCode.D,
} as const;
```

#### File: `packages/core/src/bindings/presets.spec.ts`

Test cases:
- `WASD` has correct keycodes for up/down/left/right (W/S/A/D)
- `ARROWS` has correct keycodes for up/down/left/right arrow keys
- `AD` has correct keycodes for positive/negative (D/A)
- All presets are frozen / readonly (TypeScript `as const` ensures this at
  compile time, but verify the values are correct at runtime)

### Task 5.1 Acceptance Criteria

- [ ] `WASD` preset exported with `{ up: W, down: S, left: A, right: D }`
- [ ] `ARROWS` preset exported with arrow key equivalents
- [ ] `AD` preset exported with `{ positive: D, negative: A }`
- [ ] All presets use `as const` for readonly literal types
- [ ] Tests pass
- [ ] `pnpm typecheck` passes

### Task 5.1 Verification

```bash
pnpm typecheck
pnpm test
```

---

## Task 5.2: Namespace Export + index.ts

### Task 5.2 What to Build

Set up `packages/core/src/index.ts` to export the full public API in two
styles: named imports and `Flux.*` namespace.

Both styles must expose identical functionality:

```ts
// Style 1: Named imports
import {
	action,
	AD,
	ARROWS,
	blocker,
	bool,
	createCore,
	deadZone,
	defineActions,
	defineContexts,
	direction1d,
	direction2d,
	direction3d,
	doubleTap,
	explicit,
	hold,
	implicit,
	negate,
	position2d,
	scale,
	tap,
	WASD,
} from "@rbxts/flux";
```

```ts
// Style 2: Namespace
import { Flux } from "@rbxts/flux";

Flux.createCore({ actions, contexts });
Flux.defineActions({ jump: Flux.bool() });
```

#### File: `packages/core/src/index.ts`

Structure the file as:

1. Re-export all public functions and types as named exports
2. Collect all named exports into a `Flux` namespace object
3. Export the namespace

```ts
// -- Action definition --
// -- Namespace --
import {
	action,
	bool,
	defineActions,
	direction1d,
	direction2d,
	direction3d,
	position2d,
} from "./actions/define";
import { AD, ARROWS, WASD } from "./bindings/presets";
import { defineContexts } from "./contexts/define";
import { createCore } from "./core/create-core";
import { deadZone } from "./modifiers/dead-zone";
import { negate } from "./modifiers/negate";
import { scale } from "./modifiers/scale";
import { doubleTap } from "./triggers/double-tap";
import { hold } from "./triggers/hold";
import { tap } from "./triggers/tap";
import { blocker, explicit, implicit } from "./triggers/wrappers";

export {
	action,
	bool,
	defineActions,
	direction1d,
	direction2d,
	direction3d,
	position2d,
} from "./actions/define";

// -- Binding presets --
export { AD, ARROWS, WASD } from "./bindings/presets";

// -- Context definition --
export { defineContexts } from "./contexts/define";
// -- Core --
export { createCore } from "./core/create-core";
// -- Modifiers --
export { deadZone } from "./modifiers/dead-zone";

export { negate } from "./modifiers/negate";
export { scale } from "./modifiers/scale";
export type { Modifier, ModifierContext } from "./modifiers/types";
// -- Triggers --
export { doubleTap } from "./triggers/double-tap";

export type { DoubleTapOptions } from "./triggers/double-tap";

export { hold } from "./triggers/hold";

export type { HoldOptions } from "./triggers/hold";
export { tap } from "./triggers/tap";
export type { TapOptions } from "./triggers/tap";
export type { Trigger, TriggerState, TriggerType, TypedTrigger } from "./triggers/types";
export { blocker, explicit, implicit } from "./triggers/wrappers";
// -- Types (re-export for consumers) --
export type { ActionConfig, ActionMap, ActionType, AllActions } from "./types/actions";
export type { BindingLike, BindingState } from "./types/bindings";
export type { ActionDiff, ContextConfig, CoreConfig, FluxCore, InputHandle } from "./types/core";
export type { ActionState, ActionValue } from "./types/state";

export const Flux = {
	action,
	AD,
	ARROWS,
	blocker,
	bool,
	createCore,
	deadZone,
	defineActions,
	defineContexts,
	direction1d,
	direction2d,
	direction3d,
	doubleTap,
	explicit,
	hold,
	implicit,
	negate,
	position2d,
	scale,
	tap,
	WASD,
} as const;
```

**Important notes for roblox-ts:**
- No default exports
- The `Flux` namespace is a plain object, not a TypeScript `namespace` declaration
- All named exports are first-class; the namespace is a convenience alias

#### Verification that both styles work

Consumers should be able to do either:

```ts
import { action, bool, createCore, defineActions } from "@rbxts/flux";
```

or:

```ts
import { Flux } from "@rbxts/flux";

const core = Flux.createCore({ actions, contexts });
```

### Task 5.2 Acceptance Criteria

- [ ] All public functions exported as named exports
- [ ] All public types re-exported
- [ ] `Flux` namespace object exported containing all public functions
- [ ] No default exports
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes

### Task 5.2 Verification

```bash
pnpm typecheck
pnpm build
```

---

## Final Checkpoint

All of the following must be true. This is the complete `@rbxts/flux` core
package:

**Functionality:**
- [ ] `defineActions` + convenience wrappers (`bool`, `direction2d`, etc.)
- [ ] `defineContexts` with priority and sink
- [ ] `createCore` cross-validates context binding keys against action names
- [ ] `register` / `unregister` lifecycle
- [ ] `update(dt)` processes full pipeline: raw input -> modifiers -> triggers -> ActionState
- [ ] `getState(handle)` returns typed ActionState with all query methods
- [ ] Context switching with priority resolution and sink
- [ ] Modifiers: `deadZone`, `negate`, `scale`
- [ ] Triggers: `hold`, `tap`, `doubleTap` with `implicit`/`explicit`/`blocker`
- [ ] Rebinding: `rebind`, `rebindAll`, `resetBindings`, `resetAllBindings`
- [ ] Persistence: `serializeBindings`, `loadBindings`
- [ ] Replication: `flushDiffs`, `applyDiff`, auto/manual flush
- [ ] Simulation: `simulateAction`
- [ ] Binding presets: `WASD`, `ARROWS`, `AD`
- [ ] Both `import { createCore }` and `import { Flux }` styles work

**Quality:**
- [ ] Zero `any` casts in public API
- [ ] All action/context types inferred at compile time
- [ ] All tests pass (`pnpm test`)
- [ ] Typechecking passes (`pnpm typecheck`)
- [ ] Build passes (`pnpm build`)
- [ ] No default exports
