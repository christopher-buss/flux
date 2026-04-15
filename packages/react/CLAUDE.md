## Package

`@rbxts/flux-react` — thin React wrapper over `@rbxts/flux`. Exports
`createFluxReact({ core })` returning `{ core, flush, FluxProvider,
useAction, useActiveContext, useBindings, useInputContext }`.

## Module Layout (src/)

- `create-flux-react.tsx` — thin factory assembling the return object.
- `flux-context.tsx` — internal `FluxContextValue` + `createUseFluxContext`.
- `flux-provider.tsx` — `FluxProviderProps` + Provider factory.
- `hooks/use-action.tsx` — `useAction` hook + overload interface.
- `hooks/use-bindings.tsx` — `useBindings` hook + overload interface.
- `hooks/use-input-context.tsx` — `useActiveContext` + `useInputContext` hooks.

## Testing Layering

- **Smoke** (`src/create-flux-react.spec.tsx`): factory shape only.
- **Integration** (`src/*.spec.tsx`): colocated next to each module.
  Provider lifecycle, selector semantics, handle/rerender resync,
  context/triggers/StrictMode, context hooks. Uses real `createCore` — no mocks.
- **E2E** (`e2e/react/`): full game with real input devices.

Shared test fixtures + helpers at `test/fixtures.ts` and `test/probes.tsx`.

## Constraints

**`useAction` bail-out uses a ref, not `setValue(prev)`.** React-Lua's
internal bail-out does not reliably skip rerenders on the first post-change
flush when the functional updater returns `previous`. The wrapper compares
via `lastValueRef.current` and only calls `setValue` on actual change. Do
not "simplify" back to the naive `setValue((prev) => prev === x ? prev : x)`
pattern — it reintroduces spurious rerenders.

**`useAction` has delayed-resync on Provider handle/selector changes.** A
Provider `handle` prop swap or a new selector identity does NOT immediately
update the rendered value — the next `flush()` catches it via the subscribe
callback. Locked by the `handle and rerender resync` describe block in
`src/hooks/use-action.spec.tsx`.

**JSX intrinsic elements exclude `Name` and `Parent`.** `InstanceAttributes`
in `@rbxts/react` excludes these. Distinguish probes in tests via `Text`
content + `queryByText`, not `Name` + `FindFirstChild`.

**Render-counting probes mutate via closure functions, not direct
assignment.** The `react/no-outside-reassign` lint rule blocks writing to
outer variables or object properties from inside a component. Use
`makeRenderCounter()` (returns `{ get, tick }`) from `test/probes.tsx`.

**Hook files are `.tsx`, not `.ts`.** The `max-lines-per-function` lint cap
(30) is disabled for `.tsx` but enforced on `.ts`. Hook factory functions
exceed 30 lines by nature of the ref-pattern bail-out — keep them in `.tsx`.

## Critical Files

- `src/create-flux-react.tsx` — factory assembling the return object.
- `src/flux-context.tsx` — shared Provider context + `useFluxContext`.
- `src/update-signal.ts` — subscribe/fire plumbing used by the wrapper.
- `test/probes.tsx` — shared probe factories.
- `test/fixtures.ts` — shared action map, contexts, and
  trigger thresholds.

## Commands

```bash
pnpm test                                     # root: build all + run all tests
pnpm --filter @rbxts/flux-react dev:build     # build just this package
pnpm --filter @rbxts/flux-react test          # jest-roblox only (no build)
pnpm --filter @rbxts/flux-react typecheck
pnpm run lint                                 # workspace-wide
```

Per-package `test` no longer builds — compilation is driven centrally by root
`pnpm dev:build` (one `rbxtsc --build tsconfig.build.json` walks the whole
graph). For scoped iteration, run `dev:build` then `test` explicitly.
