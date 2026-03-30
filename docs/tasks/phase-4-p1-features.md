# Phase 4: P1 Features

## Project Overview

Flux is an Input Action System wrapper for Roblox built with roblox-ts. It wraps
Roblox's `InputAction`, `InputBinding`, and `InputContext` APIs with a
declarative authoring layer. The core package (`@rbxts/flux`) is ECS-agnostic,
operating on opaque `InputHandle`s (branded numbers). This is a roblox-ts
project -- no default exports, uses Roblox globals (`Vector2`, `Vector3`,
`Enum`, etc.).

**Pipeline**: raw input -> modifiers -> triggers -> ActionState

## Prerequisites

Phase 3 must be complete. `createCore` must return a fully working `FluxCore`
with register/update/getState/unregister. The P1 methods in `createCore` are
currently stubbed with `error("Not implemented")`.

The following must exist and pass typechecking:

- `packages/core/src/core/create-core.ts` -- createCore with working P0 methods
- `packages/core/src/core/action-state-impl.ts` -- ActionState implementation
- `packages/core/src/core/pipeline.ts` -- modifier -> trigger pipeline
- `packages/core/src/core/handle-factory.ts` -- InputHandle allocator
- All Phase 1 and 2 files (types, actions, contexts, modifiers, triggers)

## Target File Structure

After this phase, modified/new files:

```text
packages/core/src/
  core/
    create-core.ts              # updated: P1 methods implemented
    create-core.spec.ts         # updated: new tests for P1 methods
    rebinding.ts                # rebinding logic (extracted if needed)
    rebinding.spec.ts           # tests
    replication.ts              # network replication logic
    replication.spec.ts         # tests
    simulate.ts                 # simulateAction logic
    simulate.spec.ts            # tests
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

These types already exist in the codebase. Listed here for convenience.

**InputHandle** (from `types/core.ts`):

```ts
type InputHandle = number & { readonly __brand: unique symbol };
```

**BindingState** (from `types/bindings.ts`):

```ts
type BindingLike = Enum.KeyCode | Enum.UserInputType | Record<string, Enum.KeyCode>;

type BindingState<TActions extends ActionMap = ActionMap> = Partial<
	Record<AllActions<TActions>, ReadonlyArray<BindingLike>>
>;
```

**ActionDiff** (from `types/core.ts`):

```ts
interface ActionDiff {
	readonly action: string;
	readonly state: string;
	readonly value: unknown;
}
```

**ActionValue** (from `types/state.ts`):

```ts
type ActionValue<TActions extends ActionMap, A extends AllActions<TActions>> =
	A extends BoolActions<TActions>
		? boolean
		: A extends Direction1dActions<TActions>
			? number
			: A extends Direction2dActions<TActions>
				? Vector2
				: A extends Direction3dActions<TActions>
					? Vector3
					: A extends ViewportPositionActions<TActions>
						? Vector2
						: unknown;
```

**Relevant FluxCore methods** (from `types/core.ts`):

```ts
interface FluxCoreMethods<TActions extends ActionMap> {
	applyDiff(handle: InputHandle, diff: ActionDiff): void;
	// Replication
	flushDiffs(handle: InputHandle): ReadonlyArray<ActionDiff>;
	loadBindings(handle: InputHandle, data: BindingState<TActions>): void;
	// Rebinding
	rebind(
		handle: InputHandle,
		action: AllActions<TActions>,
		bindings: ReadonlyArray<BindingLike>,
	): void;
	rebindAll(handle: InputHandle, bindings: BindingState<TActions>): void;
	resetAllBindings(handle: InputHandle): void;

	resetBindings(handle: InputHandle, action: AllActions<TActions>): void;
	serializeBindings(handle: InputHandle): BindingState<TActions>;

	// Simulation
	simulateAction<A extends AllActions<TActions>>(
		handle: InputHandle,
		action: A,
		state: ActionValue<TActions, A>,
	): void;
}
```

**CoreConfig replication** (from `types/core.ts`):

```ts
interface CoreConfigReplication {
	readonly replication?: {
		readonly flush?: "auto" | "manual";
		readonly onDiffs?: (handle: InputHandle, diffs: ReadonlyArray<ActionDiff>) => void;
		/**
		 * "remote" (default) -- diff-based replication via onDiffs callback.
		 * "native" -- no-op; for games using server authority (beta), where
		 * IAS replicates input automatically.
		 */
		readonly transport?: "native" | "remote";
	};
}
```

---

## Task 4.1: Rebinding + Persistence

### Task 4.1 Overview

Implement the rebinding and persistence methods on `FluxCore`. These replace
the Phase 3 stubs.

**These three tasks (4.1, 4.2, 4.3) are independent and can run in parallel.**

### Task 4.1 Implementation Details

Each handle in `createCore` needs a binding override map:

```ts
// Internal state per handle
type BindingOverrides = Map<string, ReadonlyArray<BindingLike>>;
```

The original bindings come from `CoreConfig.contexts`. Overrides replace
specific action bindings at runtime.

**`rebind(handle, action, bindings)`**:
1. Store the override: `overrides.set(action, bindings)`
2. Destroy existing Roblox `InputBinding` instances for this action
3. Create new `InputBinding` instances from the new bindings
4. Parent them under the appropriate `InputContext`

**`rebindAll(handle, bindings)`**:
1. Replace the entire override map for this handle
2. Rebuild all Roblox `InputBinding` instances
3. This is a full replace, not a patch

**`resetBindings(handle, action)`**:
1. Remove the override for this action: `overrides.delete(action)`
2. Rebuild Roblox `InputBinding` instances from original context bindings

**`resetAllBindings(handle)`**:
1. Clear the entire override map
2. Rebuild all Roblox `InputBinding` instances from original context bindings

**`serializeBindings(handle)`**:
1. Build a `BindingState` from the current effective bindings
2. Include both overrides and original bindings
3. Return as a plain object (user handles JSON encode/decode)

**`loadBindings(handle, data)`**:
1. Set overrides from the provided `BindingState`
2. Rebuild Roblox `InputBinding` instances
3. Equivalent to calling `rebindAll` with the loaded data

### Task 4.1 Test Cases

**`packages/core/src/core/rebinding.spec.ts`** (or add to `create-core.spec.ts`):

- `rebind` updates bindings for a single action
- `rebind` does not affect other actions
- `rebindAll` replaces all bindings
- `resetBindings` restores original binding for one action
- `resetAllBindings` restores all original bindings
- `serializeBindings` returns current effective bindings
- `loadBindings` restores serialized state
- Round-trip: serialize -> load produces same behavior

### Task 4.1 Acceptance Criteria

- [ ] `rebind(handle, action, bindings)` updates one action's bindings
- [ ] `rebindAll(handle, bindings)` replaces full binding state
- [ ] `serializeBindings(handle)` returns `BindingState<TActions>`
- [ ] `loadBindings(handle, data)` restores bindings from serialized state
- [ ] `resetBindings(handle, action)` restores defaults for one action
- [ ] `resetAllBindings(handle)` restores all defaults
- [ ] All tests pass
- [ ] `pnpm typecheck` passes

### Task 4.1 Verification

```bash
pnpm typecheck
pnpm test
```

---

## Task 4.2: Network Replication

### Task 4.2 Overview

Implement diff-based network replication. `ActionDiff` is a buffer type that
captures action state changes for transmission via RemoteEvents.

**These three tasks (4.1, 4.2, 4.3) are independent and can run in parallel.**

**Note (2026-03-30):** e2e validated that when server authority (beta) is
enabled, `InputAction.GetState()` replicates to the server natively. Games
using server authority can opt into `"native"` transport to skip diff-based
replication entirely. Most games will use `"remote"` (default).

### Task 4.2 Implementation Details

Each handle needs a diff buffer:

```ts
// Internal state per handle
type DiffBuffer = Array<ActionDiff>;
```

During `update()`, whenever an action's trigger state changes or its value
changes meaningfully, push an `ActionDiff` to the buffer:

```ts
interface ActionDiff {
	readonly action: string; // action name
	readonly state: string; // TriggerState value
	readonly value: unknown; // serialized action value
}
```

**Flush modes** (from `CoreConfig.replication.flush`, only relevant for `"remote"`):
- `"auto"` (default) -- at the end of `update()`, automatically call flush
  and invoke `onDiffs(handle, diffs)` if there are pending diffs
- `"manual"` -- diffs accumulate until `flushDiffs(handle)` is called

**`flushDiffs(handle)`**:
1. Return the current diff buffer for this handle
2. Clear the buffer
3. If `onDiffs` callback is configured, invoke it with the diffs

**`applyDiff(handle, diff)`**:
1. Apply a received diff to the handle's ActionState
2. Set the action's value and trigger state from the diff
3. This is the server-side entry point for consuming client input

### Task 4.2 Test Cases

**`packages/core/src/core/replication.spec.ts`** (or add to `create-core.spec.ts`):

- Diffs are generated when action state changes during update
- `flushDiffs` returns pending diffs and clears the buffer
- `flushDiffs` returns empty array when no changes
- Auto flush mode invokes `onDiffs` during update
- Manual flush mode does not invoke `onDiffs` during update
- `applyDiff` updates the handle's action state
- Only changed actions generate diffs (no spam)

### Task 4.2 Acceptance Criteria

- [ ] `replication.transport: "remote"` (default) collects diffs
- [ ] `replication.transport: "native"` is a no-op (server authority handles it)
- [ ] `replication.flush: "auto"` flushes in `update()`
- [ ] `replication.flush: "manual"` requires explicit `flushDiffs(handle)`
- [ ] `replication.onDiffs` callback receives `(handle, diffs)`
- [ ] `applyDiff(handle, diff)` applies client input on server
- [ ] `ActionDiff` is serializable (no Roblox instances, just strings/numbers)
- [ ] All tests pass
- [ ] `pnpm typecheck` passes

### Task 4.2 Verification

```bash
pnpm typecheck
pnpm test
```

---

## Task 4.3: Simulate Action

### Task 4.3 Overview

Implement `simulateAction` for script-driven input injection. Used for
tutorials, cutscenes, tests, and AI-controlled entities.

**These three tasks (4.1, 4.2, 4.3) are independent and can run in parallel.**

### Task 4.3 Implementation Details

**`simulateAction(handle, action, value)`**:
1. Validate the handle exists
2. The value type is constrained by `ActionValue<TActions, A>` at compile time
3. Feed the value through the normal pipeline:
   - Apply modifiers from the action config
   - Compute magnitude
   - Run triggers
   - Update ActionState
4. The simulated value replaces the raw input for this frame only
5. On the next `update()` call, if no new simulation, the action reverts to
   real input

Implementation approach:
- Store a "simulated value" override per action per handle
- In `update()`, check for simulated values before reading from Roblox IAS
- After processing, clear the simulated value (one-shot)
- The simulated value flows through the full pipeline (modifiers + triggers)

### Task 4.3 Test Cases

**`packages/core/src/core/simulate.spec.ts`** (or add to `create-core.spec.ts`):

- `simulateAction` with a bool value triggers `pressed` / `justPressed`
- `simulateAction` with a Vector2 value is readable via `direction2d`
- Simulated value flows through modifiers (e.g., deadZone applies)
- Simulated value flows through triggers (e.g., hold accumulates)
- Simulation is one-shot: next update without simulate reverts to real input
- Type constraint: compile error if value type doesn't match action type

### Task 4.3 Acceptance Criteria

- [ ] `simulateAction(handle, action, value)` sets action state
- [ ] Value type is constrained by action type via `ActionValue<TActions, A>`
- [ ] Simulated input flows through the normal modifier -> trigger pipeline
- [ ] Simulation is one-shot per frame
- [ ] All tests pass
- [ ] `pnpm typecheck` passes

### Task 4.3 Verification

```bash
pnpm typecheck
pnpm test
```

---

## Phase 4 Checkpoint

All of the following must be true before moving to Phase 5:

- [ ] `rebind` / `rebindAll` update bindings at runtime
- [ ] `serializeBindings` / `loadBindings` round-trip correctly
- [ ] `resetBindings` / `resetAllBindings` restore original bindings
- [ ] Network replication collects and flushes diffs
- [ ] `applyDiff` applies diffs on server side
- [ ] `simulateAction` injects values through the full pipeline
- [ ] All P1 stubs from Phase 3 are replaced with real implementations
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] No `any` casts in any source file
