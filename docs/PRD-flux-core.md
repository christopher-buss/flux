# PRD: Flux Core (`@rbxts/flux`)

**Author:** isentinel | **Status:** Draft | **Date:** 2026-03-15

## 1. Summary

Flux is a type-safe Input Action System for Roblox built with roblox-ts. It
wraps Roblox's `InputAction`, `InputBinding`, and `InputContext` APIs with a
declarative authoring layer, compile-time validated context bindings, stateful
triggers (hold/tap/doubleTap), value modifiers (deadZone/negate/scale), and
network replication. The core package (`@rbxts/flux`) is ECS-agnostic, operating
on opaque `InputHandle`s (branded numbers) so that JECS, React, or custom
wrappers integrate separately.

## 2. Objectives

1. **Declarative action authoring** -- `defineActions` + `defineContexts` with
   full generic inference so action names, types, and binding keys are validated
   at compile time.
2. **Trigger pipeline** -- Implement the magnitude-based trigger system
   (`hold`, `tap`, `doubleTap`) with `implicit`/`explicit`/`blocker` layering,
   following Unreal Enhanced Input conventions.
3. **Modifier pipeline** -- Composable, stateless value transforms (`deadZone`,
   `negate`, `scale`) applied before triggers in the input pipeline.
4. **Context switching** -- Priority-based context system with `sink` support
   so higher-priority contexts (UI) can block lower-priority ones (gameplay).
5. **Network replication** -- `remote` transport via RemoteEvents with
   `auto`/`manual` flush modes, plus `applyDiff` for server-side consumption.

## 3. User Stories

### P0 -- Must Have

#### US-1: Define actions with type safety

As a roblox-ts developer, I want to define input actions with literal type
preservation (`"Bool"`, `"Direction2D"`, etc.), so that incorrect method calls
(e.g., `pressed("move")` on a Direction2D) are caught at compile time.

Acceptance Criteria:
- [ ] `defineActions` preserves literal action names and types via generics
- [ ] `action({ type })` is the canonical low-level API
- [ ] Convenience wrappers (`bool()`, `direction2d()`, `position2d()`,
      `direction1d()`, `direction3d()`) fix the `type` literal
- [ ] Type extractors (`BoolActions<T>`, `Direction2DActions<T>`, etc.) filter
      action names by type

#### US-2: Define contexts with validated bindings

As a roblox-ts developer, I want to define input contexts with bindings that
are validated against my action names, so that typos in binding keys are compile
errors, not runtime bugs.

Acceptance Criteria:
- [ ] `defineContexts` preserves literal context names
- [ ] `createCore` cross-validates binding keys against `keyof TActions`
- [ ] Each context has `priority: number` and optional `sink: boolean`
- [ ] Bindings map action names to `ReadonlyArray<BindingLike>`

#### US-3: Core runtime loop

As a game developer, I want a single `update(deltaTime)` call that processes
all input through the modifier -> trigger -> state pipeline, so that I can
query action state per-frame with minimal boilerplate.

Acceptance Criteria:
- [ ] `createCore({ actions, contexts })` returns a typed `FluxCore<TActions>`
- [ ] `register(...contexts)` returns an `InputHandle`
- [ ] `update(dt)` processes all registered handles
- [ ] `getState(handle)` returns typed `ActionState<TActions>`
- [ ] `unregister(handle)` cleans up

#### US-4: ActionState query interface

As a game developer, I want type-constrained query methods on `ActionState`, so
that I can read input values with correct types and without runtime errors.

Acceptance Criteria:
- [ ] Bool methods: `pressed()`, `justPressed()`, `justReleased()` accept only
      `BoolActions<T>`
- [ ] Axis methods: `axis1d()`, `direction2d()`, `axis3d()`, `position2d()`
      accept only matching types
- [ ] Trigger methods: `triggered()`, `ongoing()`, `canceled()` accept any action
- [ ] `getState(action)` returns the correct value type per action
- [ ] `claim(action)` / `isClaimed(action)` for exclusive consumption

#### US-5: Modifier pipeline

As a game developer, I want to attach modifiers (deadZone, negate, scale) to
actions, so that raw input values are transformed before reaching triggers or
state queries.

Acceptance Criteria:
- [ ] `Modifier` interface with typed `modify()` overloads (number, Vector2,
      Vector3)
- [ ] `deadZone(threshold)`, `negate()`, `scale(factor)` helpers exported
- [ ] Modifiers run before triggers in the pipeline
- [ ] Modifiers receive `ModifierContext` with `deltaTime` and `handle`

#### US-6: Trigger pipeline

As a game developer, I want to attach triggers (hold, tap, doubleTap) to
actions with implicit/explicit/blocker semantics, so that complex input
gestures are handled declaratively.

Acceptance Criteria:
- [ ] `Trigger` interface with `update(magnitude, duration, deltaTime)` and
      `reset()`
- [ ] `TypedTrigger` wraps a `Trigger` with `"implicit" | "explicit" |
      "blocker"` type
- [ ] `hold({ attempting, oneShot, threshold })` trigger implemented
- [ ] `tap({ threshold })` trigger implemented
- [ ] `doubleTap({ window })` trigger implemented
- [ ] `implicit()`, `explicit()`, `blocker()` wrapper helpers exported

#### US-7: Context switching

As a game developer, I want to add/remove contexts on a handle at runtime with
priority-based resolution, so that switching between gameplay, UI, and menu
states is straightforward.

Acceptance Criteria:
- [ ] `addContext(handle, context)` and `removeContext(handle, context)` work
      at runtime
- [ ] `getContexts(handle)` returns active contexts
- [ ] `hasContext(handle, context)` checks membership
- [ ] Higher-priority contexts with `sink: true` block lower-priority input

### P1 -- Should Have

#### US-8: Network replication

As a game developer, I want Flux to replicate input diffs to the server via
RemoteEvents, so that server-authoritative systems can consume client input.

Acceptance Criteria:
- [ ] `replication.transport: "remote"` sends diffs via RemoteEvents
- [ ] `replication.flush: "auto"` flushes in `update()`; `"manual"` requires
      `flushDiffs(handle)`
- [ ] `replication.onDiffs` callback receives `(handle, diffs)`
- [ ] `applyDiff(handle, diff)` on server applies client input
- [ ] `ActionDiff` type is serializable

#### US-9: Rebinding and persistence

As a game developer, I want to rebind actions at runtime and serialize/load
binding state, so that players can customize their controls and persist settings.

Acceptance Criteria:
- [ ] `rebind(handle, action, bindings)` updates one action's bindings
- [ ] `rebindAll(handle, bindings)` replaces full binding state
- [ ] `serializeBindings(handle)` returns `BindingState<TActions>`
- [ ] `loadBindings(handle, data)` restores bindings from serialized state
- [ ] `resetBindings(handle, action)` and `resetAllBindings(handle)` restore
      defaults

#### US-10: Simulate action (script-driven input)

As a game developer, I want to inject input values programmatically, so that
tutorials, cutscenes, and tests can drive input without physical devices.

Acceptance Criteria:
- [ ] `simulateAction(handle, action, value)` sets action state
- [ ] Value type is constrained by action type via `ActionValue<TActions, A>`
- [ ] Simulated input flows through the normal trigger pipeline

### P2 -- Nice to Have

#### US-11: Namespace export

As a roblox-ts developer, I want to use `Flux.*` namespace syntax as an
alternative to named imports, so that I can choose the style that fits my
codebase.

Acceptance Criteria:
- [ ] `import { Flux } from "@rbxts/flux"` exposes all public APIs
- [ ] Named imports remain first-class and identical in behavior

#### US-12: Binding presets

As a game developer, I want built-in binding presets (WASD, ARROWS, AD), so
that common keyboard layouts are one-liners.

Acceptance Criteria:
- [ ] `WASD` preset exported (`{ up: W, down: S, left: A, right: D }`)
- [ ] `ARROWS` preset exported
- [ ] `AD` preset exported (`{ positive: D, negative: A }`)

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | `update()` must process 64 handles in < 1ms on mid-tier hardware |
| Type Safety | Zero `any` casts in public API; all action/context types inferred |
| Bundle Size | Core package < 50 KB transpiled Luau |
| API Surface | Both `Flux.*` namespace and named imports, same behavior |
| Compatibility | roblox-ts >= 3.x, @rbxts/services |

## 5. Dependencies

| Dependency | Owner | Status | Notes |
|------------|-------|--------|-------|
| Roblox `InputAction` API | Roblox | Available | Core wraps this |
| `@rbxts/services` | roblox-ts community | Stable | Service wrappers |
| roblox-ts compiler | roblox-ts | Stable | Build toolchain |

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Roblox `InputAction` API changes | High | Pin to known-good API surface; abstract behind Flux types |
| Type inference limits in roblox-ts | Medium | Test complex generics early; simplify if compiler struggles |
| Performance with many handles | Low | Benchmark with 64+ handles; optimize hot path in `update()` |

## 7. Out of Scope

- JECS/ECS wrapper (separate `@rbxts/flux-jecs` package)
- React wrapper (separate `@rbxts/flux-react` package)
- `"native"` transport (reserved for future server-authoritative games)
- Visual binding editor / Studio plugin
- Internal implementation details (this PRD covers public API only)
