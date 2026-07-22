## API

Full API design: `docs/core-api-proposal.md`.

## Constraints

**InputContexts must be descendants of a Player.** For server-authoritative
experiences the engine reads ownership from the hierarchy. Server:
`core.register(parent, ...)` creates replicating instances. Client:
`core.subscribe(parent, ...)` finds server-created instances (FindFirstChild +
ChildAdded); `core.register(parent, ...)` makes local-only input.

**Context priority: lower number = lower priority.** UI contexts usually run
high priority + sink to block gameplay input.

**Shared bindings are per-context.** The same key maps to different actions in
different contexts (`ButtonR2` = "accelerate" while driving, "attack" in
gameplay); only the active context receives input.

**The current platform is module state, not core state.** `getInputPlatform` /
`onInputPlatformChanged` / `setInputPlatformOverride` are free functions —
`PreferredInput` belongs to the client, not to a core instance, and an override
only some readers honour is worse than none. Client-only, and every engine call
lives in `platform/engine-source.ts` behind an `InputPlatformSource` so the
rules stay testable. That adapter imports `@rbxts/services`, and
`engine-source.spec.ts` mocks it with `jest.doMock("@rbxts/services", ...)` —
`jest.spyOn(game, "GetService")` does not reach the module under test, but a
module mock does. `rbxts-transformer-jest` (wired via `plugins` in
`tsconfig.spec.json`) rewrites the string specifier into the module instance at
compile time; `@roblox-ts/rojo-resolver` is aliased to `@isentinel/rojo-utils`
in the catalog so nested `*.project.json` mounts resolve. The `source`-condition
resolution failure that once forbade node-module imports in core's source is
fixed by the `@isentinel/roblox-ts` symlink patch. See
`docs/adr/0005-live-input-platform.md`.

**`test.project.json` mounts the package build (`out/`) inside
`rbxts_include.node_modules.@rbxts`, not at `ReplicatedStorage` root.**
Package-type builds import node modules via `TS.getModule`, which walks
ancestors looking for a `node_modules` folder — mounted outside one, every
node-module import fails at runtime (`Could not find module`). Same pattern as
jecs. And `rbxtsc --build` does not track rojo project files: after any mount
change, delete `out-test/` and rebuild, or compiled specs keep their old
instance paths and the run hangs silently on `WaitForChild`.

**`createCore` freezes the caller's binding tables in place.** Every binding
array in the context config is `table.freeze`d at construction, because reads
hand the consumer's own table back by identity and `ReadonlyArray` is erased at
runtime. The config is the consumer's table, so this is observable to them: it
cannot be edited after a core is built from it. Already-frozen tables are
skipped — `table.freeze` errors on one, and a context record is routinely shared
between cores (and across specs).

**Core is ECS-agnostic — keep it that way.** Core speaks opaque `InputHandle`s;
the entity ↔ handle mapping lives in the JECS wrapper, never in core.
