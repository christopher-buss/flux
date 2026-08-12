## Package

`@rbxts/flux-react` — thin React wrapper over `@rbxts/flux`. Exports
`createFluxReact<Actions, Contexts>()` returning
`{ flush, FluxProvider, useAction, useActiveContext, useBindings, useCapture, useCaptureAction, useFluxCore, useInputContext, useInputPlatform }`.
Core is injected at render time via
`<FluxProvider core={core} handle={handle}>`, so the factory can live in a
shared module that never touches a world or core at import time.

## Layout (`src/`)

- `create-flux-react.tsx` — factory assembling the return object.
- `flux-context.tsx` — internal `FluxContextValue` + `createUseFluxContext`.
- `flux-provider.tsx` — `FluxProviderProps` + Provider factory.
- `update-signal.ts` — subscribe/fire plumbing the wrapper drives.
- `use-sync-external-store.tsx` — React's store hook when the running react-lua
  has one, else the ported shim. `selectStoreHook` picks, once, at module load.
- `batch-sync.ts` — re-entrant `flushSync` the signal and the shim share.
- `hooks/` — one hook per file: `use-action`, `use-bindings`, `use-capture`
  (exports `useCapture` + `useCaptureAction`), `use-flux-core`,
  `use-input-context` (exports `useActiveContext` + `useInputContext`),
  `use-input-platform`. `useInputPlatform` is the odd one out: it reads core's
  module-level platform signal, so it takes no `FluxContextValue`, is a plain
  hook rather than a `createUseX` factory, and is exported from the package
  index as well as hanging off `createFluxReact()`.

## Testing

- **Smoke** (`create-flux-react.spec.tsx`) — factory shape only.
- **Integration** (`src/*.spec.tsx`) — colocated per module: provider lifecycle,
  selector semantics, handle/rerender resync, context/triggers/StrictMode. Real
  `createCore`, no mocks.
- **E2E** (`e2e/react/`) — full game with real input devices.

Shared fixtures and probes: `test/fixtures.ts`, `test/probes.tsx`.

## Constraints

**`useAction` bail-out uses a ref, not `setValue(prev)`.** React-Lua's bail-out
doesn't reliably skip the first post-change flush when the updater returns
`previous`. The wrapper compares `lastValueRef.current` and calls `setValue`
only on real change. Don't "simplify" back to
`setValue((prev) => prev === x ? prev : x)` — it reintroduces spurious
rerenders.

**`useAction` resyncs late on handle/selector change.** A Provider `handle` swap
or new selector identity does not update the rendered value immediately — the
next `flush()` catches it via the subscribe callback. Locked by the
`handle and rerender resync` block in `src/hooks/use-action.spec.tsx`.

**`useCapture`'s `enabled` rides on the request, not the effect alone.** The
facade decides liveness during render by comparing request identity, so gating
the capture in the effect only would leave one commit reading live after
`enabled` went false. Mounted-means-captured is the documented default idiom;
`enabled` is for conditions that flip while the widget stays up. `debugLabel` is
deliberately _not_ part of that identity — dev-only metadata must not churn the
capture stack — so it is read at acquisition and a changed label applies to the
next one.

**`canceled()` compares the captured triple, not request identity.** Every other
read goes inert the moment `enabled` flips false, but disabling mid-press is a
capture boundary and core records the cancel against that very viewer. A child
handed the token never sees `enabled`, so swallowing it would leave a falling
edge with no verb — the charge-fired-because-a-menu-opened failure. A changed
action still swallows, because that cancel belongs to a different action.

**Flux requires a concurrent root**, in production and in specs.
`ReactRoblox.createRoot`, never `createLegacyRoot`. The RTL patch under
`patches/` buys the same for specs — `createRoot` plus renderer-owned `act`,
which the root switch does not work without. Locked by
`src/react-testing-library-root.spec.tsx`, the one spec that fails if either
hunk is dropped; everything else passes on both root types. Reasoning in
`docs/adr/0007-native-store-hook-on-a-concurrent-root.md`.

**The shim subscribes once per store, not once per consumer, and the concurrent
root does not make that redundant.** Don't "simplify" to a `subscribe` call per
consumer: each would get its own flush, so every flush but the last commits a
partial update. Rationale is on `registerStore` and in ADR 0007; locked by
`src/use-sync-external-store.tearing.spec.tsx`, which names the shim rather than
the selected hook and mounts through `mountConcurrent` because it renders
outside `act` on purpose.

**Both store-hook paths run in one pass, from one place.** The install is stock,
so `selectStoreHook` answers with the shim exactly as it does for a consumer. A
second, patched react-lua is mounted beside it at
`rbxts_include.native_store_hook` — built at postinstall by
`scripts/generate-native-store-hook.ts` from the `patches/@rbxts-js__*` files —
and reached through `#test/native-stack`. `src/native-store-hook.spec.tsx` is
the only spec that uses it. See
`docs/adr/0007-native-store-hook-on-a-concurrent-root.md`.

**Native-leg specs build elements with `NativeStack.React.createElement`, not
JSX,** and render through `NativeStack.ReactRoblox`. A component mixing the two
stacks throws: `ReactCurrentDispatcher` lives in each stack's own `shared` copy,
so stock `useState` inside a natively-rendered tree finds no dispatcher.

**Anything mounted twice must be two directories on disk.** roblox-ts maps a
source path back to a single instance path, so mounting one package directory at
two places in `test.project.json` makes that specifier ambiguous and specs start
compiling against whichever mount wins — silently. The generator copies the
`@rbxts` wrappers for that reason rather than pointing at the store again.

**A store change is only synchronous on the shim path.** React's own hook
schedules sync-lane work and lets the reconciler drain it once the stack
unwinds; the shim commits inside its own `batchSync`. Locked by the
`should defer a store change` case in `src/native-store-hook.spec.tsx`. Not a
Flux bug — it is React 18's own timing, and neither path shows a torn tree.

**Batch through `batchSync`, never `flushSync` directly.** react-lua drains the
sync queue in every `flushSync`'s finally block, including one nested inside
another (`ReactFiberWorkLoop.new.lua:1471`). A second `flushSync` therefore
commits whatever the listener set scheduled before it, splitting one `flush()`
in two: shim consumers first at sync lane, `useAction`/`useCaptureAction` after
at default lane. `batchSync` runs nested calls inline, so one `flush()` stays
one commit. Locked by `src/flush-batching.spec.tsx`.

**JSX intrinsics exclude `Name` and `Parent`.** `InstanceAttributes` in
`@rbxts/react` omits them. Distinguish test probes by `Text` + `queryByText`,
not `Name` + `FindFirstChild`.

**Render-counting probes mutate via closures, not assignment.** The
`react/no-outside-reassign` rule blocks writing outer variables from inside a
component. Use `makeRenderCounter()` (`{ get, tick }`) from `test/probes.tsx`.

**Hook files are `.tsx`, not `.ts`.** `max-lines-per-function` (30) is off for
`.tsx`, enforced on `.ts`; the ref-pattern bail-out pushes hook factories past
that cap.

## Commands

```bash
pnpm test                                   # root: build all + run all tests
pnpm --filter @rbxts/flux-react dev:build   # build just this package
pnpm --filter @rbxts/flux-react test        # jest-roblox only (no build)
pnpm --filter @rbxts/flux-react typecheck
pnpm run lint                               # workspace-wide
```

Per-package `test` no longer builds — compilation is central: root
`pnpm dev:build` runs one `rbxtsc --build tsconfig.build.json` across the graph.
For scoped iteration, run `dev:build` then `test`.
