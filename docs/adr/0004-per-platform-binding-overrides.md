# Per-platform binding overrides

A **binding override** is keyed by action _and_ platform, not by action alone.
`bindingOverrides` becomes `Map<action, Map<platform, bindings>>`, and
`rebindForPlatform(handle, action, platform, bindings)` writes exactly one
bucket. Platforms the call does not name are untouched — structurally, not by a
merge that has to be gotten right.

The flat `action → bindings[]` shape could not express "the player rebound their
gamepad" without also restating their keyboard bindings. A settings screen
editing one device had to compose the preserve-the-other-device invariant
caller-side from `getBindings` + `classifyBinding`, and the composed result
froze the untouched device's bindings into the player's save: ship a patch
changing a keyboard default, and every player who had only ever touched a
gamepad keeps the stale keyboard binding forever, with nothing in the settings
UI marking it as customized. Absence is what makes a platform track defaults, so
absence has to be representable per platform. Decided while triaging issue #131.

Platform-scoped reset is then not a feature. It is a key delete, and it falls
out of the model: dropping the `gamepad` bucket restores that device's context
defaults and cannot observe the `keyboard` bucket. `resetBindings` remains the
whole-action form — delete the inner map.

## Classification is total, positive, and never throws

`classifyBinding` previously reached `"touch"` by exhaustion: no keycode, no
directional field, no modifier, therefore touch. That is a guess, and a
per-platform rebind turns a guess into a destructive write — a `uiButton`
binding would be destroyed by a touch rebind it has nothing to do with. Touch is
now _detected_, from `pointerIndex` or `uiButton`, the two keyless shapes that
are genuinely touch.

`InputPlatform` stays three values. An `"unknown"` member was unnecessary once
touch became positive, because the only bindings that reached the old fallback
with valid data were touch bindings.

What remains is a config with no input source at all —
`{ pressedThreshold: 0.5 }` is type-legal and binds nothing, producing an
`InputBinding` the engine accepts and never fires. That is a consumer mistake,
not an unclassifiable platform, so it is caught where it does harm:
`createInputBinding` throws unconditionally, alongside the existing
`UserInputType` guard. Validating at construction rather than at classification
keeps `classifyBinding` a pure query that a settings screen can call over every
binding without a crash path, and makes an unclassifiable binding
unconstructable — so classification has no live fallback branch in any
environment, rather than one that only misfires in production.

## Unbound is an empty bucket; default is an absent one

`BindingState` becomes per-platform
(`action → { keyboard?, gamepad?, touch? }`). Within a platform, an **empty
array** is a deliberate unbind and an **absent key** means "use the code-defined
default". The distinction already held at action granularity — emergently, from
`pairs` yielding present-but-empty tables and `resolveBindings` checking
`!== undefined` rather than length — but nothing asserted it and no runtime test
pinned it. It is now contract, tested, and true one level down: "gamepad
unbound, keyboard tracking defaults" is a state a player can reach and a save
can hold.

A flat wire format cannot express that. Flattening per-platform buckets on
serialize and re-classifying on load round-trips rebinds correctly but collapses
a per-platform unbind into "never customized", because an absent platform and an
emptied one both serialize to no entries. The wire format therefore changes.
Nothing consumes it — the package is unpublished — so `loadBindings` accepts one
shape and no migration path ships.

## Reading back: origin, not emptiness

`getBindings` returned `[]` for two unrelated facts: the player unbound this
action, and this action is not declared in this context. A settings screen must
render those differently — "Jump — Unbound" versus no row at all — and could
only tell them apart by cross-referencing `getContextInfo().actions`, the same
caller-side composition #131 objects to.

`getBindingOrigin(handle, action, platform, context?)` returns
`"override" | "default" | "undeclared"`. Additive; `getBindings` keeps its
signature and its callers.

Origin is per-platform because overrides are: keyboard can be an override while
gamepad is still a default, and one verdict per action cannot express that. The
platform parameter mirrors `rebindForPlatform`, so a settings screen asks about
the device whose row it is rendering.

## Considered options

- **Flat storage, merge on write** (`rebindForPlatform` reads the current list,
  filters out the target platform, appends the new bindings) — rejected: this is
  the caller-side composition promoted into core, and it inherits the freezing
  bug wholesale. It also leaves `serializeBindings` unable to say _which_ device
  the player customized, so the save cannot distinguish a deliberate keyboard
  binding from one that was merely carried along by a gamepad edit.
- **Flat storage, re-derive on load** (drop entries still equal to the code
  default so they resume tracking) — rejected: structural equality over binding
  configs is fiddly and the un-freezing is invisible magic. It also cannot
  recover a per-platform unbind, which is indistinguishable from a default by
  construction.
- **An `"unknown"` platform preserved by every write** — rejected as
  unnecessary: once touch is positively detected, valid bindings always
  classify, and invalid ones are better rejected at construction than carried
  through the system as a fourth bucket every operation must remember to
  preserve.
- **`classifyBinding` throws on an unclassifiable binding** — rejected: it is a
  pure query called per-binding by `getBindingsForPlatform`, so a settings
  screen enumerating a malformed config would crash instead of rendering. The
  error belongs at the point of construction, which is both earlier and the only
  place the mistake is actionable.
- **`getBindings` returns `undefined` for an undeclared action** — rejected: one
  API instead of two, but it is a breaking change to a core read and forces
  nil-handling on every existing caller to serve one screen.
- **Documenting the composition instead of adding `getBindingOrigin`** —
  rejected: zero surface growth, but it leaves the invariant caller-composed,
  which is the complaint.

## Consequences

- `InputPlatform`'s meaning shifts under existing code. A `uiButton`-only
  binding still classifies `"touch"`, but a config that reached `"touch"` by
  having no input source now throws at bind time. The break is loud and at
  construction, which is the intent.
- The sourceless fallback is dead for constructed bindings but live at the API
  boundary. `classifyBinding` is public and takes a raw `BindingLike`, and
  `getBindingsForPlatform` — which `use-bindings.tsx` calls — can be handed a
  list from a deserialized save that never passed through `createInputBinding`.
  Since the function must stay total and `InputPlatform` must stay three values,
  a sourceless config there returns `"keyboard"`. That relocates the #199 hazard
  rather than removing it: a keyboard-scoped `rebindForPlatform` would sweep
  such a config up. Whoever validates loaded bindings on the way in closes it.
- `rebindForPlatform` accepts `"keyboard" | "gamepad"` only. `uiButton` holds a
  live `GuiButton` reference that cannot serialize, so a touch bucket containing
  one would not round-trip. Touch bindings are always preserved and never
  writable per-platform. Whether touch rebinding is coherent at all is deferred
  to its own research issue rather than half-answered here.
- `replayOverridesIntoContext` re-applies overrides wholesale when a context
  activates after a rebind, and needs the same per-platform treatment or
  platform state desyncs at exactly the moment a context comes online.
- `rebuildActionBindings` destroys every `InputBinding` child of an action with
  no filter. A platform predicate has to thread through it and through
  `destroyExistingBindings`.
- Binding order within a rebuilt action becomes a function of bucket iteration
  order rather than authored array order. It must be made deterministic —
  otherwise binding order is unstable across reloads, which is visible in any UI
  that lists bindings positionally.
- Three platform buckets multiply the states an action's overrides can be in.
  The empty-versus-absent contract is now load-bearing in three places per
  action instead of one, which is why it is tested rather than assumed.
