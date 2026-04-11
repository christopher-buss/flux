# `@rbxts/flux-react` — Integration Tests

## Overview

Lock wrapper contract (Provider + `useAction`) against a real `FluxCore` with
React Testing Library. Scope is between the existing unit-ish specs in
`src/*.spec.ts` and the full-stack game at `e2e/react/`.

Mirrors the `packages/core/test/integration/` layout.

## Commands

```bash
pnpm --filter @rbxts/flux-react test     # build + run jest-roblox tests
pnpm --filter @rbxts/flux-react typecheck
pnpm lint
```

## Scope

- In: Provider lifecycle, `useAction` selector semantics, multi-component
  subscriptions, explicit-handle overload, handle/selector rerender-time
  resync, context switching (`addContext`/`removeContext`), trigger actions
  (tap/hold), StrictMode, error paths.
- Out: raw input devices (e2e covers), jecs integration (separate package),
  standalone-mode factory (not yet implemented).

## Structure

### Location

`packages/react/test/integration/*.spec.ts` — matches core convention.

### `jest.config.ts` — add 2nd project

```ts
// packages/react/jest.config.ts
const integrationProject = {
	test: {
		displayName: { name: "react:integration", color: "white" },
		include: ["test/**/*.spec.ts"],
		mockDataModel: true,
		outDir: "out-test/test",
	},
};
```

### `renderWithFlux` helper — local to react pkg

New file `packages/react/test/integration/helpers/render-with-flux.ts`. React
only — nothing else in the repo needs it. Promote to `@flux/test-utils` later
if jecs pkg grows an equivalent need.

Signature (tentative):

```ts
declare function renderWithFlux<T extends ActionMap>(
	ui: (flux: FluxReact<T>, handle: InputHandle) => React.ReactElement,
	options: {
		actions: T;
		context: string;
		contexts: Record<string, ContextConfig>;
		instance?: Instance | undefined;
	},
): RenderResult & {
	readonly core: FluxCore<T>;
	readonly flux: FluxReact<T>;
	readonly handle: InputHandle;
};
```

Cleanup via RTL. Returns core+flux+handle for direct interaction in tests.
`getState` spy is NOT wired by default — tests that need it attach via
`jest.spyOn(core, "getState")` explicitly (see Assertion strategy).

### Fixtures

`packages/react/test/integration/fixtures.ts`:

- `TEST_ACTIONS` — Bool (`jump`), Axis1d (`throttle`), Vector2 (`move`), plus
  one tap-wrapped and one hold-wrapped Bool action. Trigger thresholds live in
  this file (e.g. `TAP_THRESHOLD = 0.2`, `HOLD_THRESHOLD = 0.5`) so tests
  drive frame math from a single source, not hardcoded literals.
- `TEST_CONTEXTS` — `gameplay`, `ui` (higher priority + sink), `menu`.

### Setup

- `_G.__DEV__ = true` in shared setup (enables StrictMode dev checks).
- Global `afterEach(cleanup)` via `packages/test-utils/loaders/react-setup.luau`
  to drop per-test `afterThis(cleanup)`. Confirm RTL-lua doesn't already.

## Assertion strategy

No production changes. Two primitives carry the weight.

### 1. Render-count probes (primary)

Probe components increment a counter on render. This is the main tool. Most
contract claims ("flip causes exactly one rerender", "unrelated flush causes
zero", "StrictMode settles at one effect") resolve cleanly here.

### 2. `jest.spyOn(core, "getState")` (narrow, gray-box)

**Not a general subscriber-count proxy.** `useAction` calls
`context.getState(handle)` in two places:

- render path (`const state = context.getState(handle)` inside the hook body)
- subscribe callback (re-read on every signal fire)

On a flush that changes selector output, each affected hook calls `getState`
twice (callback + rerender). On an unrelated rerender, `getState` fires once
via render path. **Only no-op flushes after `mockClear()` give a clean count
equal to subscriber count** (1 call per hook, subscribe-callback only).

Valid uses (lock these into the helper comments):

| Assertion                                       | How                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| N subscribers present after mount               | Mount N, `mockClear()`, flush once with no state change, expect N calls                      |
| Unmount drops subscriber                        | Unmount, `mockClear()`, flush, expect 0 calls                                                |
| Two sibling Providers, no crosstalk             | Spy both cores, `mockClear()` both, flush flux A, expect core B spy has 0 calls              |
| StrictMode doesn't double-subscribe             | Mount under StrictMode, `mockClear()`, flush no-op, expect 1 call (not 2)                    |
| Flush after unmount does not re-read state      | Unmount, `mockClear()`, flush, expect 0 calls + no errors                                    |

Invalid uses (don't rely on `getState` counts for these — use render counts):

- Counting rerenders caused by value flips
- Measuring selector identity effects
- Anything that exercises the render path

## Test groups (4 files)

Files consolidated to reduce duplication. Each group lists an ordered set of
`it` blocks.

### 1. `provider-lifecycle.spec.ts`

Provider mount, unmount, nesting, multi-provider isolation, outside-Provider
error.

- Mount → `getState` spy (no-op flush) reports 1 call.
- Unmount then flush: no error, spy call count stays 0 after `mockClear`.
- Missing Provider → `useAction` asserts `"useAction must be used within a
  FluxProvider"`.
- Nested Providers: inner handle wins for inner children, outer for outer.
- **Same-core multi-Provider**: one `FluxReact`, two `<FluxProvider>` siblings
  with two different handles. One signal fans out to all subscribers, so both
  subtrees react to the same flush but each reads its own handle's state.
  Verify: press on handle A → component A rerenders, component B unchanged.
- **Cross-core multi-Provider**: two separate `FluxReact` instances in two
  subtrees. Spy both cores. Flush flux A → core B's `getState` untouched.
- Double flush w/o update between: second flush is no-op wrt rendered output.

### 2. `selector-semantics.spec.ts`

`useAction` selector behavior under repeated flushes.

- Bool primitive: flip true→false→true, render count = 3 (initial + 2). Hold
  for 3 flushes → render count unchanged.
- Axis1d: updates on value change, stable on repeat.
- Vector2 scalar selectors: `(s) => s.direction2d("move").X` and `.Y`
  separately — only the changed axis re-renders its consumer. (Luau `==` on
  Vector2 is value-based, so this works without a shallow-equal helper.)
- **Identity pitfall** (new-table selector): a selector that builds a fresh
  table each call, e.g. `(s) => ({ x: s.direction2d("move").X })`, re-renders
  every flush because referential equality fails on the outer table. Lock
  this behavior with a test + TSDoc note in `create-flux-react.ts` pointing
  users toward scalar selectors.
- Unstable selector identity: inline arrow each render — `useEffect`
  resubscribes via its deps array; verify no dropped updates across the
  resubscribe boundary (flip between renders is still reflected after flush).

### 3. `handle-and-rerender.spec.ts`

Rerender-time resync contract + explicit-handle overload. **This is the
weakest-contract area of the current impl** — `useAction` seeds via
`useState(() => selector(state))` and only updates on subsequent flushes, so
handle and selector changes are delayed-until-flush. Lock that explicitly.

- **Provider `handle` prop swap, delayed resync**: after prop changes,
  rendered value stays at the old handle's value until the next flush. After
  flush with no state change, verify UI now reflects new handle's state.
  (If you later want "immediate on rerender", this test is the seam — flip
  it red first, then update impl.)
- **Selector identity change, delayed resync**: swap to a different selector
  function on rerender; rendered value stays stale until next flush.
- Explicit handle overload: two sibling components with distinct handles —
  each tracks its own. Press on handle A → only component A rerenders.
- Mixed default + explicit in one component: both paths coexist, both
  update on flush.
- Provider `handle` prop swap while a child uses explicit handle → explicit
  child's render count unchanged.
- **Cross-core explicit handle**: two `FluxReact` instances with non-
  colliding handles (force disjoint by calling `register` on both cores and
  using only the distinct values). Probe current behavior — if passing a
  handle from core B to a hook bound to core A produces undefined behavior
  or throws, lock that. Skip if contract is deliberately undefined.

### 4. `context-triggers-strict.spec.ts`

Context switching via real APIs + triggers + StrictMode + error edges.

- `core.addContext(handle, "ui")` enables `ui` bindings → after press+update+
  flush, hook reflects new pressed state. `core.removeContext(handle, "ui")`
  → hook returns to false.
- Press→release across two updates: false → true → false in UI.
- **Tap trigger**: press+release within `TAP_THRESHOLD` (from fixtures) →
  `pressed` true for one frame. Assert render count = 3 (initial false, tap
  frame true, clear frame false).
- **Hold trigger**: press held past `HOLD_THRESHOLD` → `pressed` true;
  release clears.
- Context stack: add `ui` (higher priority, sinks) → gameplay action unbound
  → hook renders `false` despite key "down".
- `flush()` before any `update()`: no throw, no renders.
- `React.StrictMode` wrapping Provider: full press/flush cycle. After
  stabilization + `mockClear`, no-op flush shows 1 `getState` call (not 2),
  probe renders exactly once on flip, effect double-invoke leaks nothing.
- Unmount mid-flight under StrictMode: `unmount()` then flush → spy 0, no
  errors.

## Tasks (TDD red → green)

1. Add `renderWithFlux` at
   `packages/react/test/integration/helpers/render-with-flux.ts`. Wraps
   `createCore` + `createFluxReact` + `register` + RTL `render`. Returns
   `{ core, flux, handle, ...queries }`. No spy wired by default.
2. Write `test/integration/fixtures.ts` — `TEST_ACTIONS`, `TEST_CONTEXTS`,
   `TAP_THRESHOLD`, `HOLD_THRESHOLD`, `FRAME_TIME`.
3. Add integration project to `packages/react/jest.config.ts`.
4. Wire global `afterEach(cleanup)` in `react-setup` loader if not present.
5. Write test files in this order (each red first):
   1. `provider-lifecycle.spec.ts` — factory/provider smoke + mount/unmount +
      no-op flush delivery (where `getState` spy is sound).
   2. `selector-semantics.spec.ts` — primitive, axis1d, vector scalars,
      identity pitfall, unstable selector.
   3. `handle-and-rerender.spec.ts` — **write this early, it exposes the
      delayed-resync contract**. Any red-stays-red here is a real bug or a
      deliberate contract decision — flag to user.
   4. `context-triggers-strict.spec.ts` — real API context switching,
      triggers, StrictMode last (depends on everything else working).
6. Migrate `src/create-flux-react.spec.ts`: keep minimal smoke (factory shape
   only), move the rest. Decide on full delete vs retain at migration time.
7. Run `nr test` in `packages/react`. Confirm `create-flux-react.ts` +
   `update-signal.ts` stay at 100% coverage.
8. Create `packages/react/CLAUDE.md`: layering — unit `src/*.spec.ts`,
   integration `test/integration/*.spec.ts`, e2e `e2e/react/`.
9. `nr typecheck` + `nr lint`.

## Checkpoint

- All 4 integration files green.
- No-op-flush `getState` spy invariant documented in helper + enforced in
  every test that uses it.
- Delayed-resync contract on handle/selector change locked with explicit
  tests (or flipped red to drive an impl change, user's call).
- Identity pitfall locked on fresh-table selector (not Vector2).
- Trigger frame math driven from fixture constants, not hardcoded.
- StrictMode green under `_G.__DEV__ = true`.
- Coverage 100% on wrapper sources.

## Open questions

1. **Delayed-resync contract**: is "handle/selector change only takes effect
   on next flush" the intended contract, or a bug? Plan currently locks the
   current behavior — if intended is "immediate on rerender", flip the two
   resync tests red and fix impl.
2. `renderWithFlux` API: callback form `(flux, handle) => element` vs raw
   `render()` + returned `{ flux, handle }`? Callback hides provider wiring;
   raw more flexible for nested/multi-provider tests in group 1.
3. Migrate `src/create-flux-react.spec.ts` fully to `test/integration/`, or
   retain minimal smoke file in `src/`?
4. Cross-core explicit handle (group 3 edge): lock current behavior, or
   declare it outside-contract and skip?
5. Global cleanup in `react-setup` loader: confirm
   `@rbxts-js/react-testing-library-lua` doesn't already register one.
