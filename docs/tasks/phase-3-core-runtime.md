# Phase 3: Core Runtime (Tracer Bullet)

## Project Overview

Flux is an Input Action System wrapper for Roblox built with roblox-ts. It wraps
Roblox's `InputAction`, `InputBinding`, and `InputContext` APIs with a
declarative authoring layer. The core package (`@rbxts/flux`) is ECS-agnostic,
operating on opaque `InputHandle`s (branded numbers). This is a roblox-ts
project -- no default exports, uses Roblox globals (`Vector2`, `Vector3`,
`Enum`, etc.).

**Pipeline**: raw input -> modifiers -> triggers -> ActionState

This phase is the **tracer bullet** -- a minimal end-to-end slice through all
layers. Once `createCore` works with `register`, `update`, and `getState`, the
system is validated from authoring to runtime.

## Prerequisites

Phases 1 and 2 must be complete. The following must exist and pass typechecking:

- `packages/core/src/types/actions.ts` -- ActionType, ActionConfig, ActionMap, type extractors
- `packages/core/src/types/bindings.ts` -- BindingLike
- `packages/core/src/types/contexts.ts` -- ContextConfig
- `packages/core/src/actions/define.ts` -- defineActions, action, bool, etc.
- `packages/core/src/contexts/define.ts` -- defineContexts
- `packages/core/src/modifiers/` -- deadZone, negate, scale, Modifier interface
- `packages/core/src/triggers/` -- hold, tap, doubleTap, implicit/explicit/blocker, Trigger interface

**Note**: `types/core.ts` and `types/state.ts` are created in this phase.

## Target File Structure

After this phase, new/modified files:

```text
packages/core/src/
  types/
    bindings.ts                 # (modify: add BindingState)
    core.ts                     # InputHandle, FluxCore, ActionDiff
    state.ts                    # ActionState, ActionValue, ActionValueMap
  modifiers/
    types.ts                    # (modify: add `handle: InputHandle` to ModifierContext)
  core/
    create-core.ts              # createCore implementation
    create-core.spec.ts         # tests
    action-state-impl.ts        # ActionState implementation class
    action-state-impl.spec.ts   # tests
    pipeline.ts                 # modifier -> trigger pipeline processing
    pipeline.spec.ts            # tests
    handle-factory.ts           # InputHandle allocation
    handle-factory.spec.ts      # tests
  index.ts                      # updated with all public re-exports
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

## Key Type Definitions (for reference)

These types already exist in `packages/core/src/types/`. Listed here so you
don't need to look them up.

**InputHandle** (from `types/core.ts`):

```ts
type InputHandle = number & { readonly __brand: unique symbol };
```

**ActionConfig** (from `types/actions.ts`):

```ts
type ActionType = "Bool" | "Direction1D" | "Direction2D" | "Direction3D" | "ViewportPosition";

interface ActionConfig<T extends ActionType = ActionType> {
	readonly description?: string;
	readonly enabled?: boolean;
	readonly modifiers?: ReadonlyArray<Modifier>;
	readonly triggers?: ReadonlyArray<TypedTrigger>;
	readonly type: T;
}

type ActionMap = Record<string, ActionConfig>;
```

**ActionValue** (from `types/state.ts`):

```ts
interface ActionValueMap {
	Bool: boolean;
	Direction1D: number;
	Direction2D: Vector2;
	Direction3D: Vector3;
	ViewportPosition: Vector2;
}

type ActionValue<TActions extends ActionMap, A extends AllActions<TActions>> =
	TActions[A] extends ActionConfig<infer T> ? ActionValueMap[T] : never;
```

**BindingState** (from `types/bindings.ts`):

```ts
type BindingState<TActions extends ActionMap = ActionMap> = Partial<
	Record<AllActions<TActions>, ReadonlyArray<BindingLike>>
>;
```

**ActionState** (from `types/state.ts`):

```ts
interface ActionState<TActions extends ActionMap = ActionMap> {
	axis1d(action: Direction1dActions<TActions>): number;
	axis3d(action: Direction3dActions<TActions>): Vector3;
	axisBecameActive(action: AxisActions<TActions>): boolean;
	axisBecameInactive(action: AxisActions<TActions>): boolean;
	canceled(action: AllActions<TActions>): boolean;
	claim(action: AllActions<TActions>): boolean;
	currentDuration(action: AllActions<TActions>): number;
	direction2d(action: Direction2dActions<TActions>): Vector2;
	getState<A extends AllActions<TActions>>(action: A): ActionValue<TActions, A>;
	isAvailable(action: AllActions<TActions>): boolean;
	isClaimed(action: AllActions<TActions>): boolean;
	isEnabled(action: AllActions<TActions>): boolean;
	justPressed(action: BoolActions<TActions>): boolean;
	justReleased(action: BoolActions<TActions>): boolean;
	ongoing(action: AllActions<TActions>): boolean;
	position2d(action: ViewportPositionActions<TActions>): Vector2;
	pressed(action: BoolActions<TActions>): boolean;
	previousDuration(action: AllActions<TActions>): number;
	triggered(action: AllActions<TActions>): boolean;
}
```

**FluxCore** (from `types/core.ts`):

```ts
interface FluxCore<TActions extends ActionMap = ActionMap> {
	addContext(handle: InputHandle, context: string): void;
	applyDiff(handle: InputHandle, diff: ActionDiff): void;
	destroy(): void;
	flushDiffs(handle: InputHandle): ReadonlyArray<ActionDiff>;
	getContexts(handle: InputHandle): ReadonlyArray<string>;
	getState(handle: InputHandle): ActionState<TActions>;
	hasContext(handle: InputHandle, context: string): boolean;
	loadBindings(handle: InputHandle, data: BindingState<TActions>): void;
	rebind(
		handle: InputHandle,
		action: AllActions<TActions>,
		bindings: ReadonlyArray<BindingLike>,
	): void;
	rebindAll(handle: InputHandle, bindings: BindingState<TActions>): void;
	register(...contexts: ReadonlyArray<string>): InputHandle;
	removeContext(handle: InputHandle, context: string): void;
	resetAllBindings(handle: InputHandle): void;
	resetBindings(handle: InputHandle, action: AllActions<TActions>): void;
	serializeBindings(handle: InputHandle): BindingState<TActions>;
	simulateAction<A extends AllActions<TActions>>(
		handle: InputHandle,
		action: A,
		state: ActionValue<TActions, A>,
	): void;
	unregister(handle: InputHandle): void;
	update(deltaTime: number): void;
}
```

**Modifier** (from `modifiers/types.ts` -- updated in this phase to add `handle`):

```ts
type ModifierValue = number | Vector2 | Vector3;

interface ModifierContext {
	readonly deltaTime: number;
	readonly handle: InputHandle;
}

interface Modifier {
	modify(value: number, context: ModifierContext): number;
	modify(value: Vector2, context: ModifierContext): Vector2;
	modify(value: Vector3, context: ModifierContext): Vector3;
}
```

Note: `ModifierValue` already exists from Phase 2. Use it in pipeline code
instead of inlining the union.

**Trigger types** (from `triggers/types.ts`):

```ts
type TriggerState = "canceled" | "none" | "ongoing" | "triggered";

interface Trigger {
	reset?(): void;
	update(magnitude: number, duration: number, deltaTime: number): TriggerState;
}

type TriggerType = "blocker" | "explicit" | "implicit";

interface TypedTrigger {
	readonly trigger: Trigger;
	readonly type: TriggerType;
}
```

---

## Task 3.1: InputHandle Factory + ActionState Implementation

### Task 3.1 What to Build

Four things: new type definitions, the handle factory, the ActionState
implementation, and extending `ModifierContext` with the handle.

#### `packages/core/src/types/state.ts` (new)

Define `ActionValueMap`, `ActionValue`, and `ActionState` interface as shown
in the Key Type Definitions section above.

#### `packages/core/src/types/bindings.ts` (modify existing)

Add `BindingState` type:

```ts
export type BindingState<TActions extends ActionMap = ActionMap> = Partial<
	Record<AllActions<TActions>, ReadonlyArray<BindingLike>>
>;
```

#### `packages/core/src/types/core.ts` (new)

Define `InputHandle`, `ActionDiff`, and `FluxCore` interface as shown in the
Key Type Definitions section above.

#### `packages/core/src/modifiers/types.ts` (modify existing)

Add `handle: InputHandle` to `ModifierContext` now that `InputHandle` exists:

```ts
import type { InputHandle } from "../types/core";

export interface ModifierContext {
	readonly deltaTime: number;
	readonly handle: InputHandle;
}
```

#### `packages/core/src/core/handle-factory.ts`

A simple monotonically increasing ID allocator that returns branded
`InputHandle` values.

Implementation notes:
- Start at 1 (0 is falsy in Lua)
- `allocate()` returns the next handle
- `release(handle)` marks it available (optional: can just increment forever)
- Brand the number: `return nextId++ as unknown as InputHandle`

#### `packages/core/src/core/action-state-impl.ts`

A concrete class implementing the `ActionState<TActions>` interface. This is
the internal mutable state object that `createCore` updates each frame.

Internal storage per action (keyed by action name string):
- `value`: `boolean | number | Vector2 | Vector3` -- current post-pipeline value
- `previousValue`: same type -- value from previous frame
- `triggerState`: `TriggerState` -- current trigger output
- `previousTriggerState`: `TriggerState` -- trigger output from previous frame
- `duration`: `number` -- how long the action has been in current trigger state
- `previousDuration`: `number` -- duration of previous trigger state
- `enabled`: `boolean` -- whether the action is active
- `claimed`: `boolean` -- exclusive consumption flag

Method implementations:
- `pressed(action)` -- returns `value === true`
- `justPressed(action)` -- `value === true && previousValue === false`
- `justReleased(action)` -- `value === false && previousValue === true`
- `direction2d(action)` -- returns `value as Vector2`
- `axis1d(action)` -- returns `value as number`
- `axis3d(action)` -- returns `value as Vector3`
- `position2d(action)` -- returns `value as Vector2`
- `axisBecameActive(action)` -- magnitude went from 0 to >0
- `axisBecameInactive(action)` -- magnitude went from >0 to 0
- `triggered(action)` -- `triggerState === "triggered"`
- `ongoing(action)` -- `triggerState === "ongoing"`
- `canceled(action)` -- `triggerState === "canceled"`
- `currentDuration(action)` -- returns `duration`
- `previousDuration(action)` -- returns `previousDuration`
- `getState(action)` -- returns `value` with correct type via cast
- `claim(action)` -- sets `claimed = true`, returns `true` if was unclaimed
- `isClaimed(action)` -- returns `claimed`
- `isAvailable(action)` -- `enabled && !claimed`
- `isEnabled(action)` -- returns `enabled`

Internal mutation methods (not on the public interface, used by `createCore`):
- `_updateAction(name, value, triggerState, deltaTime)` -- called by pipeline
- `_endFrame()` -- shifts current to previous, resets claimed flags
- `_setEnabled(name, enabled)` -- sets enabled state

### Task 3.1 Test Files

**`packages/core/src/core/handle-factory.spec.ts`**:
- Allocates unique handles
- Handles are sequential
- First handle is non-zero

**`packages/core/src/core/action-state-impl.spec.ts`**:
- `pressed` returns true when bool value is true
- `justPressed` detects frame transition false->true
- `justReleased` detects frame transition true->false
- `direction2d` returns the stored Vector2
- `triggered` returns true when triggerState is "triggered"
- `ongoing` returns true when triggerState is "ongoing"
- `canceled` returns true when triggerState is "canceled"
- `claim` returns true first time, sets isClaimed
- `claim` returns false if already claimed
- `isAvailable` is true when enabled and not claimed
- `_endFrame` shifts current to previous

### Task 3.1 Acceptance Criteria

- [ ] `InputHandle` factory allocates unique, non-zero handles
- [ ] `ActionStateImpl` implements all `ActionState` interface methods
- [ ] Internal mutation methods work correctly for frame updates
- [ ] All tests pass
- [ ] `pnpm typecheck` passes

### Task 3.1 Verification

```bash
pnpm typecheck
pnpm test
```

---

## Task 3.2: Pipeline Processing

### Task 3.2 What to Build

#### `packages/core/src/core/pipeline.ts`

The modifier -> trigger pipeline that processes raw input into final
ActionState values.

The pipeline for a single action per frame:

1. **Read raw value** from Roblox IAS (`InputAction.ReadValue()` or equivalent)
2. **Apply modifiers** in order: each modifier's `modify()` receives the
   current value and returns the transformed value
3. **Compute magnitude**: `boolean` -> 0 or 1, `number` -> `math.abs(value)`,
   `Vector2` -> `value.Magnitude`, `Vector3` -> `value.Magnitude`
4. **Run triggers**: evaluate each `TypedTrigger` with `(magnitude, duration, deltaTime)`
5. **Resolve trigger state** from typed triggers:
   - If any `blocker` returns `"triggered"` -> final state is `"none"`
   - If any `explicit` returns `"triggered"` -> final state is `"triggered"`
   - If all `implicit` triggers return `"triggered"` -> final state is `"triggered"`
   - Otherwise combine: ongoing > none, canceled overrides none
   - If no triggers defined -> default triggered when magnitude > 0
6. **Return** `{ value, triggerState }` for ActionStateImpl to consume

Export a function like:

```ts
interface PipelineResult {
	triggerState: TriggerState;
	value: boolean | number | Vector2 | Vector3;
}

function processPipeline(
	rawValue: boolean | number | Vector2 | Vector3,
	actionConfig: ActionConfig,
	duration: number,
	deltaTime: number,
	modifierContext: ModifierContext,
): PipelineResult;
```

### Task 3.2 Test Files

**`packages/core/src/core/pipeline.spec.ts`**:

Test cases:
- No modifiers/triggers: value passes through, triggered when magnitude > 0
- Single modifier transforms value
- Multiple modifiers chain in order
- Single implicit trigger gates output
- Single explicit trigger gates output
- Blocker trigger prevents triggering
- Mixed implicit + explicit resolution
- Bool action: magnitude is 0 or 1
- Axis action: magnitude is vector length
- No triggers + zero magnitude = "none" state

### Task 3.2 Acceptance Criteria

- [ ] Modifiers applied in order before triggers
- [ ] Magnitude computed correctly per value type
- [ ] Trigger resolution follows implicit/explicit/blocker rules
- [ ] Default behavior (no triggers): triggered when magnitude > 0
- [ ] All tests pass
- [ ] `pnpm typecheck` passes

### Task 3.2 Verification

```bash
pnpm typecheck
pnpm test
```

---

## Task 3.3: createCore Implementation

### Task 3.3 What to Build

This is the central runtime. It wires everything together.

#### `packages/core/src/core/create-core.ts`

Implement `createCore` matching the `FluxCore` interface.

**Internal state per handle:**
- `ActionStateImpl` instance
- Active context names (set)
- Per-action Roblox IAS instances (created at register time)
- Per-action duration accumulator
- Binding overrides (for rebind support -- can be empty map initially)

**`register(...contexts)`**:
1. Allocate an `InputHandle` via the handle factory
2. Create an `ActionStateImpl` for this handle
3. For each action in the config:
   - Create a Roblox `InputAction` instance (via `new Instance("InputAction")`)
   - Set its `Type` from `ActionConfig.type`
   - For each requested context, look up bindings and create `InputBinding` instances
4. For each requested context:
   - Create a Roblox `InputContext` instance
   - Set priority
   - Parent `InputAction`s and `InputBinding`s under it
   - **Important**: InputContext instances must be descendants of the Player instance in the DataModel for Roblox network ownership
5. Add contexts to the handle's active set
6. Return the handle

**`update(deltaTime)`**:
For each registered handle:
1. For each action:
   - Read the current value from the Roblox `InputAction`
   - Run the pipeline (`processPipeline`)
   - Update the `ActionStateImpl` with the result
2. After all actions processed, call `_endFrame()` on the ActionStateImpl
3. If replication is `"auto"`, flush diffs

**`getState(handle)`**:
Return the `ActionStateImpl` for the handle (cast to `ActionState<TActions>`).

**`addContext(handle, context)` / `removeContext(handle, context)`**:
- Add/remove context from the handle's active set
- Enable/disable the corresponding Roblox `InputContext`
- Priority resolution: when multiple contexts are active, higher priority wins
- `sink: true` on a context blocks all lower-priority contexts

**`unregister(handle)`**:
- Destroy all Roblox instances created for this handle
- Remove handle from internal maps
- Release the handle ID

**`destroy()`**:
- Unregister all handles
- Clean up any shared state

**P1 methods** (stub with `error("Not implemented")` for now):
- `rebind`, `rebindAll`, `resetBindings`, `resetAllBindings`
- `serializeBindings`, `loadBindings`
- `flushDiffs`, `applyDiff`
- `simulateAction`

### Context Priority Resolution with Sink

When `update()` processes a handle:
1. Sort active contexts by priority (descending)
2. Walk from highest to lowest priority
3. Process actions that have bindings in each context
4. If a context has `sink: true`, stop processing lower-priority contexts
5. Actions only fire from the highest-priority context that binds them

### Task 3.3 Test Files

**`packages/core/src/core/create-core.spec.ts`**:

Test cases (these test the public API, mocking Roblox instances as needed):
- `createCore` returns an object with all FluxCore methods
- `register()` returns a unique InputHandle
- `register("gameplay")` sets up the gameplay context
- `getState(handle)` returns an ActionState
- `unregister(handle)` cleans up (getState throws after unregister)
- `addContext` / `removeContext` / `hasContext` / `getContexts` work
- `update(dt)` processes input (test with simulated values)
- Context priority: higher priority context wins for shared actions
- Context sink: `sink: true` blocks lower-priority contexts
- `destroy()` cleans up all handles

Note: Roblox `InputAction`, `InputBinding`, `InputContext` are engine types.
Tests will need to either mock these or use the roblox-ts test environment that
provides them. Use the project's existing test infrastructure.

### Task 3.3 Acceptance Criteria

- [ ] `createCore({ actions, contexts })` returns a typed `FluxCore<TActions>`
- [ ] `register(...contexts)` creates Roblox IAS instances and returns a handle
- [ ] `update(dt)` runs the full pipeline: read -> modify -> trigger -> state
- [ ] `getState(handle)` returns a working `ActionState`
- [ ] Context priority resolution works correctly
- [ ] `sink: true` blocks lower-priority contexts
- [ ] `unregister` and `destroy` clean up Roblox instances
- [ ] P1 methods are stubbed
- [ ] All tests pass
- [ ] `pnpm typecheck` passes

### Task 3.3 Verification

```bash
pnpm typecheck
pnpm test
```

---

## Phase 3 Checkpoint (P0 Milestone)

This is the P0 milestone. All of the following must be true:

- [ ] `createCore` returns a fully functional `FluxCore`
- [ ] End-to-end flow works: define actions -> define contexts -> createCore -> register -> update -> getState -> query
- [ ] Pipeline processes: raw input -> modifiers -> triggers -> ActionState
- [ ] Context switching with priority and sink works
- [ ] Handle lifecycle works: register -> use -> unregister
- [ ] All ActionState query methods return correct values
- [ ] P1 methods are stubbed (not crashing, just not implemented)
- [ ] `index.ts` re-exports all public API
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] No `any` casts in any source file
