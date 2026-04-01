# `@rbxts/flux-jecs` — Jecs Wrapper Package

## Overview

Thin wrapper using jecs entity IDs as Flux handles via registerAs/subscribeAs.
Exposes ActionState as a jecs component and contexts as jecs tags. Lets ECS systems query input state
via `world.query(flux.ActionState, flux.contexts.gameplay)`.

Design doc: `flux/jecs-package-example.ts`

## Commands

```bash
pnpm typecheck                          # type check all packages
pnpm build                              # transpile TypeScript to Luau
pnpm --filter @rbxts/flux-jecs test     # build + run jest-roblox tests
pnpm lint                               # lint all packages
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

- **Core is a peer dep** — user installs `@rbxts/flux` + `@rbxts/flux-jecs`
- **jecs is a peer dep** — same reason
- **No re-exports from core** — jecs package only exports `createFluxJecs` +
  types
- **ActionState reference is stable** — core mutates in place, `world.set` only
  at registration (not every frame)
- **Context tags via `world.component()`** — jecs tags are components without
  data
- **Optional BYOC** — user can pass their own `actionStateComponent` for custom
  replication
- **Networking out of scope** — no flushDiffs/applyDiff

## Critical Files

- `packages/core/src/types/core.ts` — FluxCore interface (what we delegate to)
- `packages/core/src/types/state.ts` — ActionState interface (component data)
- `packages/core/src/core/create-core.ts` — createCore factory +
  CreateCoreOptions
- `packages/core/src/core/create-core.spec.ts` — test patterns,
  TEST_ACTIONS/TEST_CONTEXTS
- `packages/core/package.json` — template for package.json structure
- `packages/core/tsconfig.*.json` — templates for tsconfig variants
- `flux/jecs-package-example.ts` — authoritative API design

---

## Phase 1: Tracer Bullet

One thin slice through all layers: scaffold just enough, define just enough
types, implement just enough code to get a single test passing that proves the
full path works: `createFluxJecs` → `register` → `getState` → `update` →
query `ActionState` from the mock world.

- [ ] **Task 1: Minimal scaffold**
  - `package.json` — name, peer deps, dev deps, scripts
  - `tsconfig.json` + `tsconfig.lib.json` + `tsconfig.spec.json` — just enough
    to compile src + spec
  - `jest.config.ts` — extend shared config
  - `test.project.json` — rojo test environment
  - `include/` — copy Promise.lua + RuntimeLib.lua from core
  - Add `{ "path": "packages/jecs" }` to root tsconfig.json references
  - Acceptance: `pnpm install && pnpm typecheck` succeeds
  - Files: `packages/jecs/` scaffold, root `tsconfig.json`

- [ ] **Task 2: Mock world + minimal types**
  - `test/mock-world.ts` — mock jecs World tracking add/remove/set/get/has calls
  - `src/types.ts` — just enough of `FluxJecsOptions` and `FluxJecs` for
    register + getState + update + ActionState property + contexts property
  - Acceptance: mock world importable, types compile
  - Files: `packages/jecs/test/mock-world.ts`, `packages/jecs/src/types.ts`

- [ ] **Task 3: Tracer bullet — register → getState → update (TDD)**
  - Red: write test that creates FluxJecs, registers entity, calls getState,
    calls update, verifies ActionState was set on mock world, verifies context
    tag was added
  - Green: implement `createFluxJecs` with just register/getState/update —
    creates core, uses entity IDs directly as handles via registerAs,
    world.set for ActionState, world.add for context tag
  - `src/index.ts` exports `createFluxJecs`
  - `src/index.spec.ts` — smoke test
  - Acceptance: test passes, proves full path works end-to-end
  - Files: `packages/jecs/src/create-flux-jecs.ts`,
    `packages/jecs/src/create-flux-jecs.spec.ts`, `packages/jecs/src/index.ts`,
    `packages/jecs/src/index.spec.ts`

### Checkpoint: Tracer Bullet

- [ ] `pnpm --filter @rbxts/flux-jecs test` passes
- [ ] One test proves: createFluxJecs → register → getState → update works
- [ ] Seek feedback before expanding

---

## Phase 2: Core Entity Lifecycle

Expand the entity lifecycle with unregister and subscribe.

- [ ] **Task 4: Implement unregister (TDD)**
  - Red: tests for cleanup — removes ActionState component, removes context
    tags, clears maps, getState throws after unregister
  - Green: core.unregister + world.remove for component + all active tags
  - Acceptance: no stale map entries, clean cleanup
  - Files: `packages/jecs/src/create-flux-jecs.ts`,
    `packages/jecs/src/create-flux-jecs.spec.ts`

- [ ] **Task 5: Implement subscribe (TDD)**
  - Red: tests for subscribe via core.subscribe, returns cancel fn, sets
    ActionState component, adds context tags
  - Green: delegates to core.subscribe, stores mapping
  - Acceptance: subscribe entity queryable, cancel fn works
  - Files: same as Task 4

### Checkpoint: Entity Lifecycle

- [ ] register + unregister + subscribe all tested and working

---

## Phase 3: Context Management

- [ ] **Task 6: Implement addContext/removeContext (TDD)**
  - Red: tests for tag sync — addContext adds jecs tag, removeContext removes it
  - Green: delegates to core, syncs world.add/world.remove
  - Acceptance: jecs tags match core context state
  - Files: `packages/jecs/src/create-flux-jecs.ts`,
    `packages/jecs/src/create-flux-jecs.spec.ts`

- [ ] **Task 7: Implement hasContext/getContexts (TDD)**
  - Delegates to core, no jecs-side work
  - Acceptance: returns correct context state
  - Files: same as Task 6

### Checkpoint: Context Management

- [ ] All context operations keep jecs tags in sync with core

---

## Phase 4: Remaining API

Expand remaining delegated methods and properties.

- [ ] **Task 8: Implement simulateAction (TDD)**
  - Entity → handle lookup → core.simulateAction
  - Acceptance: simulated input visible after update
  - Files: `packages/jecs/src/create-flux-jecs.ts`,
    `packages/jecs/src/create-flux-jecs.spec.ts`

- [ ] **Task 9: Implement rebind family + serialize/load (TDD)**
  - rebind, rebindAll, resetBindings, resetAllBindings, serializeBindings,
    loadBindings
  - All entity → handle → core delegation
  - Acceptance: methods delegate correctly
  - Files: same as above

- [ ] **Task 10: Implement destroy (TDD)**
  - core.destroy() + clear maps
  - Acceptance: post-destroy operations throw
  - Files: same as above

- [ ] **Task 11: Expose properties + BYOC actionStateComponent**
  - `ActionState` — component entity (created internally or user-provided)
  - `contexts` — frozen record of tag entities
  - `core` — underlying FluxCore
  - Acceptance: properties typed correctly, BYOC uses provided component
  - Files: same as above

### Checkpoint: Full API

- [ ] Every method in `flux/jecs-package-example.ts` is implemented and tested

---

## Phase 5: Hardening

- [ ] **Task 12: Error handling for invalid entities**
  - Throw on unregistered entity access, double-register, etc.
  - Acceptance: descriptive errors for all invalid operations
  - Files: `packages/jecs/src/create-flux-jecs.ts`,
    `packages/jecs/src/create-flux-jecs.spec.ts`

- [ ] **Task 13: Complete FluxJecs interface + type-level tests**
  - Finalize full `FluxJecs` and `FluxJecsOptions` types in `src/types.ts`
  - `tsconfig.typetest.json` if not already created
  - `src/create-flux-jecs.spec-d.ts` — type-level tests for inference, rejected
    invalid inputs
  - Acceptance: `pnpm typecheck:types` passes
  - Files: `packages/jecs/src/types.ts`,
    `packages/jecs/src/create-flux-jecs.spec-d.ts`,
    `packages/jecs/tsconfig.typetest.json`

- [ ] **Task 14: Coverage audit**
  - Ensure 100% coverage threshold met
  - Acceptance: `pnpm --filter @rbxts/flux-jecs test` — 100% coverage
  - Files: spec files

### Checkpoint: Hardened

- [ ] 100% coverage, all edge cases, type tests pass

---

## Phase 6: Integration

- [ ] **Task 15: Lint + docs + monorepo verification**
  - Fix eslint issues, add TSDoc to public API
  - Add remaining rojo projects if not done (deploy.project.json,
    default.project.json)
  - Verify `pnpm build && pnpm test && pnpm lint` from root
  - Acceptance: full monorepo CI pipeline passes
  - Files: various

---

## Risks

| Risk                                    | Mitigation                                             |
| --------------------------------------- | ------------------------------------------------------ |
| `@rbxts/jecs` types unavailable in test | Mock world avoids needing real jecs in Rojo tree       |
| Mock world diverges from real jecs API  | Keep mock minimal, only methods wrapper actually calls |
| ActionState reference assumptions wrong | Verified: createActionState returns stable ref         |

## Verification

1. `pnpm install` — workspace resolves
2. `pnpm typecheck` — all packages type-check
3. `pnpm --filter @rbxts/flux-jecs test` — 100% coverage
4. `pnpm build` — packages/jecs/out/ generated
5. `pnpm lint` — no errors
6. `pnpm test` — full monorepo green

## Open Questions

- Package name: `@rbxts/flux-jecs` consistent with `@rbxts/flux` for core?
- Mock world vs real jecs in tests? Plan assumes mock for simplicity, but real
  jecs catches more integration issues.
