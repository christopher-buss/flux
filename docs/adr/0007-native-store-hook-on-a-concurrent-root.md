# The store hook is React's when React has one, and the root is concurrent

`useSyncExternalStore` in flux-react is chosen once, at module load:
`selectStoreHook(React)` returns `React.useSyncExternalStore` when the running
react-lua carries it, and the ported shim otherwise. This is the same detection
upstream's `use-sync-external-store/shim` performs, and it means a consumer who
gains the hook — by patching react-lua's reconciler, or because react-lua ships
it one day — needs no change in Flux.

Detection reads the React module as a local `MaybeStoreReact` rather than
declaring the hook into `@rbxts/react`. A consumer running a patched
`@rbxts/react` already declares it in their own typings, and a second
declaration would collide. `MaybeStoreReact` is also the honest type: for Flux
the key may or may not be there. It carries `useState` as a required member so
it is not a type of purely optional ones — which anything would satisfy, and
which would need a cast to pass React in.

The hook's optional third `getServerSnapshot` is not modelled. It exists in the
React 18 signature for hydration, and ReactRoblox has no hydration entry point.

## Flux requires a concurrent root

The real hook takes `subscribe` straight through, with no registration sharing
and no batching around the notification. That is only atomic on a fiber in
`ConcurrentMode`.

When a store fires N listeners in an ordinary Luau loop, each listener schedules
`SyncLane` work. On a legacy fiber the reconciler flushes the sync callback
queue inline, inside the listener, so consumer 1 renders and commits while
consumers 2..N still hold the old snapshot — N commits, and the intermediate
ones are torn. On a concurrent fiber that inline flush is skipped, the work
accumulates until the stack unwinds, and all N dirty fibers render in one pass.
One store change, one commit.

Supporting a legacy root would mean keeping a Flux-side registration layer in
front of the real hook forever, to buy back a guarantee the renderer already
gives. Requiring `ReactRoblox.createRoot` is the cheaper contract, and it is the
one React 18 itself assumes.

The shim keeps its own registry, and the concurrent root does not make it
redundant. The shim reads the store during render, so the only way it can
correct a consumer that already committed is a sync-lane flush that discards the
pass in flight — and a flush per consumer commits per consumer. One shared
subscription notifying every consumer inside one `batchSync` is what collapses
that back to one commit. React's hook needs none of this because the reconciler
does the same job a layer down, which is exactly why the two paths differ.

## Tests render where consumers do

`@rbxts-js/react-testing-library-lua` builds a legacy root and takes `act` from
its bundled react-dom copy, which cannot drain the mock Scheduler.
`patches/@rbxts-js__react-testing-library-lua@12.3.4-ts.3.patch` switches both:
`createLegacyRoot` → `createRoot` in `pure.lua`, and `testUtils.act` →
`ReactRoblox.act` in `act-compat.lua`. Without the second change the first one
leaves containers empty — a concurrent root commits nothing until something
drains the work loop.

Nothing else in the suite changed. Every out-of-React update the specs drive
goes through `flush()` — `batchSync`, so `flushSync` — or the shim's own batched
handler, and both commit synchronously whichever root is underneath. That is
also why the patch needs a lock of its own:
`src/react-testing-library-root.spec.tsx` schedules one callback on the
scheduler the reconciler shares and asserts `render` drained it, which only
holds with both hunks applied.

`test/probes.tsx:mountConcurrent` survives the switch. RTL now renders
concurrently, but wraps every render in `act`, and the tearing spec needs to
interrupt the work loop part-way.

## Both paths run in one place, in one test pass

`@rbxts/react` 17.3.7-ts.2 has no `useSyncExternalStore`, so on a default
install `selectStoreHook` always answers with the shim. That alone would leave
the branch a patched consumer takes proven by a unit test and nothing else.

The install stays stock. Instead the test place mounts a **second** react-lua
beside the first, at `rbxts_include.native_store_hook`, patched with
Roblox/react-luau#24 —
`patches/@rbxts-js__{react,react-reconciler,shared}@17.3.7-ts.1.patch`, split
out of that PR by module. `scripts/generate-native-store-hook.ts` builds it at
postinstall: copy the three packages out of the pnpm store, `git apply`, and
emit a Rojo map that is the generated one with those three `$path`s repointed.
Nothing is registered in `patchedDependencies`, so the React every package
resolves normally is untouched.

What makes this cheap is that `TS.getModule` resolves by **position** — it walks
up from the requiring script to the first `node_modules` holding the scope. The
same compiled `packages/react/out`, mounted a second time inside that subtree,
therefore binds to the patched React with no second compilation.
`test/native-stack` requires it and hands specs
`{React, ReactRoblox, FluxReact, StoreHook}`.

Two consequences fall out of that positional rule and are load-bearing:

- The native mount deliberately omits `@rbxts/flux`, so the walk up falls
  through to the one global copy and both legs share core state.
- Each mounted directory must be physically distinct. roblox-ts maps a source
  path back to one instance path, so mounting `@rbxts/react` from the store
  twice makes it ambiguous and specs start compiling against whichever mount
  wins. The wrapper packages are therefore copied, not re-mounted.

Coverage stays at 100% and stays the stock leg's job: the native mounts are
invisible to istanbul, and when React owns the hook nothing drives the shim's
effect re-checks or `batchSync`'s re-entrant branch.

Rejected: **two Reacts in one install**, which pnpm cannot express — patches key
on the resolved `name@version`, so an `npm:` alias under a second name resolves
to the same store entry and inherits the same patch. Verified, not assumed. Also
rejected: **registering the patches and running the suite twice**, which tests
the default configuration only on the pass where it is switched off.

This paid for itself immediately. Four specs asserted that a store mutation
commits synchronously — true of the shim, which notifies inside `batchSync`, and
false of React's hook, which schedules sync-lane work the reconciler drains once
the stack unwinds. That difference is now asserted directly in
`src/native-store-hook.spec.tsx` rather than described here.

## Considered options

- **Keep the shim unconditionally** — rejected: a consumer who has paid for a
  reconciler backport still runs userland code, and never gets the pre-commit
  consistency check the shim cannot reach.
- **Keep Flux's registration layer in front of the real hook** — rejected: it
  only buys legacy-root atomicity, which this ADR drops, and it hides the
  renderer's own guarantee behind a Flux-specific one.
- **An override to force the shim** — rejected: a second code path to test, for
  a bisection that a lockfile pin already answers.
- **A dev-only assert that the root is concurrent** — not done, and worth
  revisiting. A hook cannot see its root's mode in react-lua 17; the reachable
  seam is `FluxProvider`, which would have to infer the mode rather than read
  it. So a consumer who ignores this ADR still fails silently. CI does not:
  `src/react-testing-library-root.spec.tsx` fails the moment Flux's own tests
  stop rendering concurrently.

## Consequences

- `selectStoreHook` is exported and specced directly, so both branches stay
  covered on a default install where only one of them can run.
- The store-hook patches pin `17.3.7-ts.1`. A react-lua bump breaks them, and
  the `test-native-store-hook` job is what says so. Re-split them from
  Roblox/react-luau#24 against the new base, or drop them once react-lua ships
  the hook itself.
- A consumer on a legacy root loses no API, but gains a tearing window Flux no
  longer defends against.
- Behaviour differs slightly between the two paths in dev: the shim throws when
  `getSnapshot` is not reference-cached, React's hook only warns. The spec for
  that guard reads through `useSyncExternalStoreShim` by name.
