# `@rbxts/flux-react` — React Wrapper Package

## Overview

Thin React wrapper over `@rbxts/flux-core`. Provides a context Provider and
selector-based hooks for reading ActionState in React components with minimal
re-renders.

Design doc: `flux/react-package-example.ts`

## Commands

```bash
pnpm typecheck                           # type check all packages
pnpm build                               # transpile TypeScript to Luau
pnpm --filter @rbxts/flux-react test     # build + run jest-roblox tests
pnpm lint                                # lint all packages
```

## Testing

Tests use jest-roblox. Import from `@rbxts/jest-globals`:

```ts
import { describe, expect, it } from "@rbxts/jest-globals";
```

Test files are `.spec.ts`, co-located with source. **TDD: write tests before
implementation.**

---

## Architecture Decisions

- **Core is a peer dep** — user installs `@rbxts/flux-core` + `@rbxts/flux-react`
- **`@rbxts/react` is a peer dep** — same reason
- **No re-exports from core** — react package exports `createFluxReact`,
  `FluxProvider`, standalone hooks, and types
- **Hooks are standalone imports** — `useAction`, `useActionState`, etc. are
  top-level exports, not methods on the FluxReact object. They read the
  FluxReact instance + handle from Provider context.
- **Two modes** — standalone (`{ actions, contexts }`, creates core internally)
  or wrap (`{ core }`, shares existing core)
- **Central update signal** — one signal fires after `core.update(dt)`, all
  hooks subscribe to it. Not polling per-hook.
- **Selector-based change detection** — `useAction(selector)` runs selector
  against ActionState each tick, compares result to previous, only re-renders
  when different
- **Provider holds default handle** — most Roblox games have one local player.
  `useAction(selector)` reads handle from Provider context.
  `useAction(handle, selector)` overrides for multi-handle cases.
- **Standalone auto-updates** — in standalone mode, Provider connects to
  `RunService.Heartbeat` and calls `core.update(dt)` automatically. In wrap
  mode, the caller manages the update loop and fires the update signal.
- **Smart equality** — selector results compared with a built-in comparator
  that handles Roblox value types automatically. Uses `===` for primitives
  (boolean, number, string) and structural comparison for Vector2 (X, Y) and
  Vector3 (X, Y, Z) via `typeOf()` checks at runtime. Users never need to
  think about equality.

## API Proposal

### Imports

```ts
import {
	createFluxReact,
	FluxProvider,
	useAction,
	useActionState,
	useFluxCore,
	useHandle,
} from "@rbxts/flux-react";
```

### `createFluxReact`

Factory that returns a FluxReact instance. Does NOT return hooks — hooks are
standalone imports that read from Provider context.

```ts
// Standalone — creates core internally, auto-updates via Heartbeat
const flux = createFluxReact({ actions, contexts });

// Wrap — shares existing core, caller manages update loop
const flux = createFluxReact({ core });
```

#### Standalone options

```ts
interface FluxReactStandaloneOptions<T extends ActionMap, C extends Record<string, ContextConfig>> {
	readonly actions: T;
	readonly contexts: C & ValidatedContexts<T, C>;
	readonly parent?: Instance; // default: LocalPlayer
}
```

When standalone, `createFluxReact` calls `createCore({ actions, contexts })`
internally and returns the core via `flux.core`.

#### Wrap options

```ts
interface FluxReactWrapOptions<T extends ActionMap> {
	readonly core: FluxCore<T>;
}
```

#### Return type

```ts
interface FluxReact<T extends ActionMap> {
	/** The underlying FluxCore instance. */
	readonly core: FluxCore<T>;

	/**
	 * Notify hooks that ActionState has been updated.
	 *
	 * In standalone mode this fires automatically after Heartbeat.
	 * In wrap mode, call this after your own `core.update(dt)`.
	 */
	readonly flush: () => void;
}
```

### `FluxProvider`

Stores the FluxReact instance and a default `InputHandle` in React context.
Components below it can call `useAction(selector)` without passing a handle.

```tsx
interface FluxProviderProps {
	/** The FluxReact instance (from createFluxReact). */
	readonly flux: FluxReact<ActionMap>;
	/** The default InputHandle for hooks that omit the handle argument. */
	readonly handle: InputHandle;
	readonly children: React.ReactNode;
}

<FluxProvider flux={flux} handle={localHandle}>
	<App />
</FluxProvider>;
```

### `useAction`

Primary hook for reactive UI. Runs selector against ActionState on each update
tick, re-renders only when the selected value changes. Reads FluxReact + handle
from Provider context.

```ts
// Read from Provider handle
function useAction<R>(selector: (state: ActionState) => R): R;
// Explicit handle (overrides Provider)
function useAction<R>(handle: InputHandle, selector: (state: ActionState) => R): R;
```

#### Examples

```ts
// Bool — re-renders on press/release only
const jumping = useAction((state) => state.pressed("jump"));

// Number — re-renders when axis value changes
const steering = useAction((state) => state.axis1d("steer"));

// Vector2 — equality handled internally, no re-render storms
const move = useAction((state) => state.direction2d("move"));

// Explicit handle (spectator, split-screen)
const otherJumping = useAction(otherHandle, (state) => state.pressed("jump"));
```

### `useActionState`

Returns the stable ActionState reference. Does not cause re-renders — the
reference never changes. Use for imperative reads in callbacks or effects.

```ts
// Read from Provider handle
function useActionState(): ActionState;
// Explicit handle
function useActionState(handle: InputHandle): ActionState;
```

#### Example

```ts
const state = useActionState();

// Read in a callback — no re-render
const onInteract = useCallback(() => {
	if (state.justPressed("interact")) {
		openDialog();
	}
}, [state]);
```

### `useFluxCore`

Returns the FluxCore instance from Provider context. Escape hatch for
register/unregister/addContext/etc.

```ts
const core = useFluxCore();
```

### `useHandle`

Returns the default InputHandle from Provider context.

```ts
const handle = useHandle();
```

## Usage with Jecs (`@rbxts/flux-jecs` + `@rbxts/flux-react`)

The primary use case: jecs owns core + entities + update loop, react wraps the
same core for UI. This mirrors the `updateReactSystem()` pattern from
anime-rush's ECS hooks.

### Setup

```ts
import { createFluxJecs } from "@rbxts/flux-jecs";
import { createFluxReact } from "@rbxts/flux-react";

const world = Jecs.world();
const flux = createFluxJecs(world, { actions, contexts });
const fluxReact = createFluxReact({ core: flux.core });
```

### Update loop

Jecs owns the game loop. Add `fluxReact.flush()` as an ECS system that runs
after `flux.update(dt)`:

```ts
// ECS systems run in order:
function inputSystem(deltaTime: number): void {
	flux.update(deltaTime);
}

function movementSystem(): void {
	for (const [entity, state] of world.query(flux.ActionState, flux.contexts.gameplay)) {
		// ECS reads state directly — no React involved
	}
}

function reactFlushSystem(): void {
	// Notify React hooks that ActionState was updated this frame
	fluxReact.flush();
}

// Schedule: inputSystem → movementSystem → ... → reactFlushSystem (last)
```

### Provider receives jecs entity as handle

Jecs entity IDs are InputHandles (via `registerAs`). Pass the FluxReact
instance and handle to FluxProvider:

```tsx
import { FluxProvider } from "@rbxts/flux-react";

const playerEntity = flux.register(localPlayerEntity, playerInstance, "gameplay");

// Entity ID is the handle — cast is safe because registerAs uses entity as handle
<FluxProvider flux={fluxReact} handle={playerEntity as unknown as InputHandle}>
	<HUD />
</FluxProvider>;
```

### React components read the same state as ECS systems

```tsx
import { useAction } from "@rbxts/flux-react";

function JumpIndicator(): React.Element {
	// Re-renders only when pressed state changes
	const isJumping = useAction((state) => state.pressed("jump"));
	return <textlabel Text={isJumping ? "Jumping!" : ""} />;
}
```

ECS systems query ActionState via `world.query(flux.ActionState)` every frame.
React hooks query the same ActionState via selectors, re-rendering only on
change. Same data, different access patterns.

### Key points

- **One core, two access patterns** — ECS polls every frame, React re-renders
  selectively
- **Jecs manages lifecycle** — register/unregister/addContext go through the
  jecs wrapper, not React
- **`flush()` is an ECS system** — runs last in the frame, after all game
  systems have read state
- **No standalone mode needed** — when using jecs, always use wrap mode

## Critical Files

- `packages/core/src/types/core.ts` — FluxCore interface
- `packages/core/src/types/state.ts` — ActionState interface
- `packages/core/src/core/create-core.ts` — createCore factory
- `packages/core/package.json` — template for package.json structure
- `packages/core/tsconfig.*.json` — templates for tsconfig variants
- `flux/react-package-example.ts` — original API sketch

---

## Phase 1: Tracer Bullet

One thin slice: scaffold, Provider, `useAction` with selector, one test proving
the full path works.

- [ ] **Task 1: Minimal scaffold**
  - `package.json` — name, peer deps (`@rbxts/flux-core`, `@rbxts/react`,
    `@rbxts/react-roblox`), dev deps, scripts
  - `tsconfig.json` + `tsconfig.lib.json` + `tsconfig.spec.json`
  - `jest.config.ts` — extend shared config
  - `test.project.json` — rojo test environment
  - `include/` — copy Promise.lua + RuntimeLib.lua from core
  - Add `{ "path": "packages/react" }` to root tsconfig.json references
  - Acceptance: `pnpm install && pnpm typecheck` succeeds
  - Files: `packages/react/` scaffold, root `tsconfig.json`

- [ ] **Task 2: Update signal + flush mechanism**
  - Internal signal that fires when ActionState has been updated
  - `flush()` fires the signal
  - In standalone mode, Heartbeat connection calls `core.update(dt)` then
    `flush()`
  - Acceptance: signal fires, subscribers notified
  - Files: `packages/react/src/update-signal.ts`

- [ ] **Task 3: Tracer bullet — Provider + useAction (TDD)**
  - Red: test that creates FluxReact in wrap mode, renders Provider with
    handle, renders component using `useAction(selector)`, asserts initial
    value, calls `core.update(dt)` + `flush()`, asserts re-render with new
    value
  - Green: implement `createFluxReact`, Provider context, `useAction` with
    selector comparison
  - Acceptance: test passes end-to-end
  - Files: `packages/react/src/create-flux-react.ts`,
    `packages/react/src/create-flux-react.spec.ts`,
    `packages/react/src/index.ts`

### Checkpoint: Tracer Bullet

- [ ] `pnpm --filter @rbxts/flux-react test` passes
- [ ] One test proves: createFluxReact → Provider → useAction → flush → re-render
- [ ] Seek feedback before expanding

---

## Phase 2: Remaining Hooks

- [ ] **Task 4: useActionState (TDD)**
  - Returns stable ActionState ref from Provider context
  - Does not re-render on updates
  - Acceptance: ref is stable, values update in-place
  - Files: `packages/react/src/create-flux-react.ts`,
    `packages/react/src/create-flux-react.spec.ts`

- [ ] **Task 5: useFluxCore + useHandle (TDD)**
  - Read core and handle from Provider context
  - Acceptance: returns correct instances
  - Files: same as Task 4

- [ ] **Task 6: useAction explicit handle overload (TDD)**
  - `useAction(handle, selector)` ignores Provider handle
  - Acceptance: reads state from explicit handle, not Provider handle
  - Files: same as Task 4

### Checkpoint: Hooks Complete

- [ ] All four hooks tested and working

---

## Phase 3: Standalone Mode

- [ ] **Task 7: Standalone createFluxReact (TDD)**
  - `createFluxReact({ actions, contexts })` creates core internally
  - Exposes `flux.core`
  - Acceptance: `flux.core` is a working FluxCore
  - Files: `packages/react/src/create-flux-react.ts`,
    `packages/react/src/create-flux-react.spec.ts`

- [ ] **Task 8: Auto-update via Heartbeat (TDD)**
  - In standalone mode, Provider connects to `RunService.Heartbeat`
  - Calls `core.update(dt)` + `flush()` each frame
  - Disconnects on unmount
  - Acceptance: ActionState updates without manual flush
  - Files: same as Task 7

### Checkpoint: Standalone Mode

- [ ] Standalone mode creates core, auto-updates, hooks work without manual flush

---

## Phase 4: Edge Cases

- [ ] **Task 9: Smart equality for Vector2/Vector3 (TDD)**
  - Built-in comparator uses `typeOf()` to detect Vector2/Vector3 and compares
    structurally (X, Y, Z). Primitives use `===`.
  - Acceptance: Vector2 selector doesn't re-render when components are equal
  - Files: `packages/react/src/create-flux-react.ts`,
    `packages/react/src/create-flux-react.spec.ts`

- [ ] **Task 10: Stale handle guard (TDD)**
  - If handle is unregistered while component is mounted, useAction returns
    last known value (or throws?)
  - Acceptance: no runtime crash on stale handle
  - Files: same as Task 9

- [ ] **Task 11: Provider unmount cleanup (TDD)**
  - Heartbeat disconnects, signal subscribers cleaned up
  - Acceptance: no leaked connections after unmount
  - Files: same as Task 9

### Checkpoint: Hardened

- [ ] Edge cases covered, no leaked connections

---

## Phase 5: Polish

- [ ] **Task 12: Type-level tests**
  - Verify useAction selector is typed against ActionState<T>
  - Verify useAction rejects invalid selectors
  - Acceptance: `pnpm typecheck` passes
  - Files: `packages/react/src/create-flux-react.spec-d.ts`,
    `packages/react/tsconfig.typetest.json`

- [ ] **Task 13: TSDoc + exports**
  - TSDoc on all public API
  - `src/index.ts` exports `createFluxReact` + types
  - Acceptance: `pnpm lint` passes
  - Files: various

- [ ] **Task 14: Coverage audit**
  - Ensure 100% coverage threshold met
  - Acceptance: `pnpm --filter @rbxts/flux-react test` — 100% coverage
  - Files: spec files

### Checkpoint: Ship-Ready

- [ ] 100% coverage, all edge cases, type tests, lint clean

---

## Risks

| Risk | Mitigation |
|------|------------|
| Vector2/Vector3 equality | Built-in smart comparator via `typeOf()` — structural compare for vectors, `===` for primitives |
| Heartbeat lifecycle | Disconnect on Provider unmount, test explicitly |
| Stale handle after unregister | Guard in useAction, return last value or throw |
| Testing React hooks in roblox-ts | May need `@rbxts/react-test-renderer` or similar; verify in tracer bullet |
| Signal memory leaks | Auto-cleanup when last subscriber disconnects (same pattern as anime-rush hooks) |

## Open Questions

- Testing approach: `react-test-renderer` available in roblox-ts, or mock React?
- Should `flush()` be public API or internal-only? Wrap mode needs it, standalone doesn't.
- Should Provider accept optional `autoRegister` prop that calls `core.register()` and passes handle automatically?
- Package name: `@rbxts/flux-react` consistent with `@rbxts/flux-core`?
