## Package

`@rbxts/flux-react` — thin React wrapper over `@rbxts/flux`. Exports
`createFluxReact({ core })` returning `{ core, flush, FluxProvider, useAction }`.

## Testing Layering

- **Smoke** (`src/create-flux-react.spec.tsx`): factory shape only.
- **Integration** (`test/integration/*.spec.tsx`): Provider lifecycle,
  selector semantics, handle/rerender resync, context/triggers/StrictMode.
  Uses real `createCore` — no mocks.
- **E2E** (`e2e/react/`): full game with real input devices.

Shared test fixtures + helpers at `test/integration/{fixtures.ts,helpers/}`.

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
callback. Locked by `test/integration/handle-and-rerender.spec.tsx`.

**JSX intrinsic elements exclude `Name` and `Parent`.** `InstanceAttributes`
in `@rbxts/react` excludes these. Distinguish probes in tests via `Text`
content + `queryByText`, not `Name` + `FindFirstChild`.

**Render-counting probes mutate via closure functions, not direct
assignment.** The `react/no-outside-reassign` lint rule blocks writing to
outer variables or object properties from inside a component. Use
`makeRenderCounter()` (returns `{ get, tick }`) from `helpers/probes.tsx`.

## Critical Files

- `src/create-flux-react.tsx` — Provider + `useAction` implementation.
- `src/update-signal.ts` — subscribe/fire plumbing used by the wrapper.
- `test/integration/helpers/probes.tsx` — shared probe factories.
- `test/integration/fixtures.ts` — shared action map, contexts, and
  trigger thresholds.

## Commands

```bash
pnpm --filter @rbxts/flux-react test        # build + jest-roblox
pnpm --filter @rbxts/flux-react typecheck
pnpm run lint                                 # workspace-wide
```

When `pnpm test` reports `Infinite yield on WaitForChild("out")`, run
`pnpm --filter @rbxts/flux-react run clean && pnpm --filter
@rbxts/flux-react test` — it is an intermittent stale-build issue.
