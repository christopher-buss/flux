# The current platform is module state, not core state

The platform the player is using right now is read from `getInputPlatform()` — a
free function on `@rbxts/flux`, not a method on `FluxCore`.
`onInputPlatformChanged(listener)` reports changes,
`setInputPlatformOverride(platform)` forces the answer, and flux-react's
`useInputPlatform()` renders it.

`UserInputService.PreferredInput` is a property of the client, not of a core
instance. A core method would have made every reader hold a core to ask a
question that has nothing to do with actions, contexts or handles — a glyph
module that only maps a `KeyCode` to an image asset needs the platform and has
no business registering an input consumer. It would also have made the override
per-core, and an override half the readers honour is worse than no override at
all: the consuming game's Studio force-platform toggle was React-local state,
which is precisely why it never convinced anything outside the React tree.
Decided while implementing issue #130.

ADR 0004 defines _platform_ as a property of a **binding**. This one adds a
second sense — the platform of the player's **device** — and the two meet at
exactly one point: `useBindings(action, useInputPlatform())` asks the device
what it is, then asks core for that platform's bindings.

## The override lies to every reader, or it is not a seam

`setInputPlatformOverride` outranks the device in one place,
`findInputPlatform`, which `getInputPlatform` and the change signal both resolve
through. A forced platform is therefore indistinguishable from a real one: no
reader has an "is this overridden?" branch to get wrong, and no reader can be
forgotten when the toggle is flipped. That is what makes it usable as a Studio
toggle and as the tests' seam at the same time.

The same choice answers what happens off the client. `getInputPlatform()` throws
there — the platform is a property of a device that does not exist, and a
plausible `"keyboard"` would silently render the wrong glyphs — but the override
is checked _first_, so a forced platform makes the module answer anywhere.
Subscribing never throws: subscription is passive, and a listener off the client
simply hears override changes only.

## Changes publish through one path

Both the engine's `PreferredInput` connection and `setInputPlatformOverride`
call the same `publish`, which compares the resolved platform against the last
one delivered. Every rule about when the signal fires then falls out rather than
being a case to implement: a device flip underneath an override is silent, and
clearing an override that disagrees with the device fires exactly once. No
debounce — `PreferredInput` is already the engine's curated answer, not a raw
input event.

The engine connection is opened for the first listener and released with the
last, so nothing is watched while nobody is listening.

## `useBindings` keeps its default

`useBindings(action)` with no platform still returns the composed bindings for
every platform. The live platform composes at the call site instead:

```tsx
function JumpPrompt(): React.ReactNode {
	const platform = useInputPlatform();
	const bindings = useBindings("jump", platform);
	return <Glyph binding={bindings[0]} />;
}
```

Issue #130 proposed defaulting the no-platform form to the live platform. That
is a silent behaviour change to every existing call site — a two-entry list
becoming a one-entry list, with nothing at the call site to read as the cause —
in exchange for saving one line. `platform` is already a dependency of the
hook's reader, so composition needs no new machinery.

## The device is a parameter, and the engine is one implementation of it

`createInputPlatformSignal(source)` takes an `InputPlatformSource` — `find()`
and `watch(onChanged)` — and `engineInputSource` is the one implementation that
touches `UserInputService`. This is not a hypothetical extension point: it lets
a test drive a device flip with a plain object, so every rule above is verified
against a synchronous fake rather than through mocking machinery.

The adapter itself is tested too, which is why it reads its services through
`@rbxts/services` rather than calling `game.GetService` inline.
`jest.spyOn(game, "GetService")` is scoped to the spec file that installs it and
never reaches the module under test; a module mock does. So
`engine-source.spec.ts` uses `jest.doMock` plus `jest.isolateModules` to load
the adapter against a stubbed `@rbxts/services` — once per test, since each
needs a different answer from `IsClient`.

A node-module import in core's _source_ used to break every workspace package
that compiles that source through the `source` export condition — which all four
e2e games do: roblox-ts mapped the module back through
`packages/core/node_modules`, and the consumer then found it outside its own
tree (`You cannot use modules directly under node_modules`). The
`@isentinel/roblox-ts` patch fixes the symlink reverse-lookup to prefer the
compiling project's own `node_modules`, so the import resolves for every
consumer.

So `services.ts` carries the coverage exclusion instead: two `game.GetService`
calls, no branches, no rule. Services are read per call rather than held at
module scope, so importing `@rbxts/flux` on the server never reaches for a
client-only service.

## Considered options

- **`core.getInputPlatform()`** — rejected: forces a core on readers that have
  no other use for one, and makes the override per-core.
- **`useBindings(action)` defaults to the live platform** — rejected above.
- **A `"live"` sentinel for the platform parameter** — rejected: a second
  vocabulary in a parameter that currently means exactly one thing, to save the
  same one line.
- **Read `PreferredInput` at each call with no watcher** — rejected: a glyph UI
  needs to know _when_ it flipped, not only what it is.

## Consequences

- Module state is per-Luau-VM, so the override and the listener set are shared
  by everything on that client. That is the point, and it means a test that sets
  an override must clear it.
- `getInputPlatform()` throwing off the client makes a shared module that reads
  it at import time a server crash. Read it inside a client entry point.
- flux-react gains a hook that needs no `FluxProvider`, so `useInputPlatform` is
  exported directly from `@rbxts/flux-react` as well as hanging off
  `createFluxReact()`.
- `useBindings` republishes from an effect, so a composed
  `useBindings(action, useInputPlatform())` lands the new platform's bindings on
  the commit after the flip rather than during it. One frame, invisible for a
  glyph swap; the react package already documents the same late resync for
  `useAction`.
- A fourth `Enum.PreferredInput` member would report `"keyboard"` rather than
  failing, matching how `classifyBinding` answers for a binding it cannot place.
