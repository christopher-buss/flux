# Implementation Plan: `useActiveContext` + `useInputContext`

## Overview

Add two React hooks that subscribe to context state: a cheap boolean
`useActiveContext(name, handle?)` and a fat `useInputContext(name, handle?)`
returning `{ isActive, priority, sink, actions }`. Requires a new
`getContextInfo(handle, name)` method on `FluxCore` — handle-aware so it
future-proofs against per-handle priority/sink overrides.

## Architecture Decisions

- **`getContextInfo` takes a handle.** Config is global today, but Roblox
  `InputContext` Priority/Sink are runtime-mutable and core may grow
  per-handle overrides. Signature absorbs that without future breakage.
- **`actions` = declared action set** (`Object.keys(config.bindings)`), not
  "actions with live bindings post-rebind". Declared set is stable; live-binding
  queries belong on `getBindings`.
- **Throw on unknown context name.** Types guard this; a runtime miss is a
  bug, not a recoverable case.
- **`useActiveContext` is a separate implementation, not a wrapper.** Keeps
  the cheap path cheap — one boolean subscribe + `===` bail-out, no object
  construction per flush.
- **Both hooks reuse the existing `update-signal`.** Option A from brainstorm
  — no new core signal, one-frame latency matches `useAction`.
- **Fat hook memoizes the static slice** (`[core, name]`) and only rebuilds
  the returned object when `active` flips. Ref-based bail-out, same pattern
  as `useBindings`.

## Task List

### Phase 1: Core — `getContextInfo`

#### Task 1: Add `getContextInfo` to FluxCore

**Description:** New method on `FluxCore<Actions, Contexts>`:
`getContextInfo(handle, name) → { active, priority, sink, actions }`. Reads
contexts record stored at `createCore` time, applies defaults
(`priority = DEFAULT_CONTEXT_PRIORITY`, `sink = false`), pulls `actions` from
`Object.keys(bindings)`, reads `active` from per-handle active set. Throws on
unknown name; validates handle via existing `getHandleData` path.

**Acceptance criteria:**

- [ ] Interface declared in `types/core.ts` with TSDoc
- [ ] Implemented in `create-core.ts`
- [ ] Throws with descriptive error on unknown context name
- [ ] Throws on invalid handle (same path as other per-handle queries)
- [ ] Returns readonly `actions` array typed as `ReadonlyArray<AllActions<Actions>>`

**Verification:**

- [ ] `pnpm --filter @rbxts/flux typecheck`
- [ ] Unit tests in `create-core.spec.ts` cover: happy path, defaults applied,
      unknown name throws, active flips with add/remove

**Dependencies:** None

**Files touched:**

- `packages/core/src/types/core.ts`
- `packages/core/src/core/create-core.ts`
- `packages/core/src/core/create-core.spec.ts`
- `packages/core/src/types/types.spec-d.ts`

**Scope:** S

### Checkpoint: Core

- [ ] `pnpm --filter @rbxts/flux test` passes
- [ ] Typecheck clean

### Phase 2: React hooks

#### Task 2: Implement `useActiveContext`

**Description:** Boolean hook. Mirrors `useAction` shape: overloaded for
optional explicit handle, subscribes to update-signal, reads
`core.hasContext(handle, name)`, ref-based bail-out on `===`. Wired into
`FluxReact<T, Contexts>` return type and `createFluxReact`.

**Acceptance criteria:**

- [ ] Two overloads: `(name)` and `(handle, name)`
- [ ] `name` typed as `Contexts` generic
- [ ] Ref-based bail-out (no naive functional setState)
- [ ] Throws if used outside `FluxProvider` (shared `useFluxContext` helper)
- [ ] Exported from package index

**Verification:**

- [ ] `pnpm --filter @rbxts/flux-react typecheck`
- [ ] Integration test `test/integration/use-active-context.spec.tsx` covering
      active↔inactive flips, explicit handle override, render-counter bail-out,
      delayed-resync on Provider handle swap

**Dependencies:** Task 1

**Files touched:**

- `packages/react/src/create-flux-react.tsx`
- `packages/react/src/index.ts`
- `packages/react/test/integration/use-active-context.spec.tsx`
- `packages/react/src/create-flux-react.spec-d.ts`

**Scope:** S

#### Task 3: Implement `useInputContext`

**Description:** Fat hook returning `{ active, priority, sink, actions }`.
Memoize static slice on `[core, name]` via `useMemo` calling
`core.getContextInfo` once per name change; separately subscribe to
update-signal to track `active`; rebuild returned object only when `active`
flips. Object-identity bail-out on active-unchanged frames.

**Acceptance criteria:**

- [ ] Two overloads: `(name)` and `(handle, name)`
- [ ] Returned `actions` typed as `ReadonlyArray<AllActions<T>>`
- [ ] Static slice stable across flushes when `active` unchanged (render
      counter doesn't tick)
- [ ] Unknown context name propagates the core throw
- [ ] Wired into `FluxReact<T, Contexts>` return type + `createFluxReact`

**Verification:**

- [ ] Integration test `test/integration/use-input-context.spec.tsx`: returns
      correct priority/sink/actions, static slice stability, unknown name
      throws, active flip causes rerender with correct boolean, handle
      override works

**Dependencies:** Task 1

**Files touched:**

- `packages/react/src/create-flux-react.tsx`
- `packages/react/src/index.ts`
- `packages/react/test/integration/use-input-context.spec.tsx`
- `packages/react/src/create-flux-react.spec-d.ts`

**Scope:** S

### Checkpoint: Hooks

- [ ] `pnpm test` (root — builds all, runs all)
- [ ] `pnpm run lint`
- [ ] Both hooks appear in `FluxReact` return type with full generics

### Phase 3: Docs

#### Task 4: Update package docs

**Description:** Update `packages/react/CLAUDE.md` to mention the two new
hooks alongside `useAction`/`useBindings`. If a package-level README example
exists, add a brief usage snippet for `useActiveContext`. No new ADR needed
— this is additive.

**Acceptance criteria:**

- [ ] `packages/react/CLAUDE.md` factory-shape line updated
- [ ] Any hook-listing in README or core-api-proposal referencing hook
      surface updated

**Verification:**

- [ ] Manual skim

**Dependencies:** Tasks 2, 3

**Files touched:**

- `packages/react/CLAUDE.md`
- possibly `README.md` / `packages/core/docs/core-api-proposal.md`

**Scope:** XS

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `getContextInfo` signature wrong if per-handle overrides differ from mental model | Med | Handle-aware signature; implementation is a thin passthrough today so future refactor is internal |
| `useInputContext` object identity churns every flush, defeating bail-out | Med | Static slice `useMemo` + rebuild only on `active` change; test asserts render counter stays flat across flushes with no state change |
| React-Lua bail-out quirks (see `create-flux-react.tsx` constraint docs) | Med | Mirror `useBindings` ref-pattern exactly; don't invent a new approach |
| Delayed-resync on Provider handle swap breaks user expectations | Low | Locked by existing test invariant; document in tests |

## Open Questions

- `getContextInfo` return shape: inline object vs named `ContextInfo<Actions>`
  type exported from core? (Named is nicer for consumers re-using the type;
  inline is one less export.)
- Throw type for unknown name: reuse existing `FluxError` / context error
  class, or new?
- `DEFAULT_CONTEXT_PRIORITY` — already public from `@rbxts/flux`?
