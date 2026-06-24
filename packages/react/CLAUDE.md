## Package

`@rbxts/flux-react` — thin React wrapper over `@rbxts/flux`. Exports
`createFluxReact<Actions, Contexts>()` returning
`{ flush, FluxProvider, useAction, useActiveContext, useBindings, useFluxCore, useInputContext }`.
Core is injected at render time via
`<FluxProvider core={core} handle={handle}>`, so the factory can live in a
shared module that never touches a world or core at import time.

## Layout (`src/`)

- `create-flux-react.tsx` — factory assembling the return object.
- `flux-context.tsx` — internal `FluxContextValue` + `createUseFluxContext`.
- `flux-provider.tsx` — `FluxProviderProps` + Provider factory.
- `update-signal.ts` — subscribe/fire plumbing the wrapper drives.
- `hooks/` — one hook per file: `use-action`, `use-bindings`, `use-flux-core`,
  `use-input-context` (exports `useActiveContext` + `useInputContext`).

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
