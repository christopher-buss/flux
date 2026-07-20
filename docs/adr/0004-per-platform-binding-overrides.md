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
unconstructable — so for bindings that go through `createInputBinding`,
classification has no live fallback branch in any environment, rather than one
that only misfires in production. The guarantee is scoped to that path: see
Consequences for the boundary where the fallback is still reachable.

`hasInputSource` and `classifyBinding` are defined in terms of one scan of the
binding's fields, so "the config names an input source" and "the config
classifies to a platform" cannot come apart. A keycode field holding something
that is not a `KeyCode` — reachable from a deserialized save — is absent to
both, and so is rejected at construction rather than admitted by the guard and
then classified through the sourceless fallback.

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
gamepad is still a default, and one verdict per action cannot express that. A
settings screen asks about the device whose row it is rendering.

The platform parameter is the full `InputPlatform`, not the `RebindPlatform`
that `rebindForPlatform` accepts. Touch is excluded from writes because a
`uiButton` cannot serialize, which says nothing about reading: a whole-action
`rebind` does write a touch bucket, so a touch row has an origin, and a screen
that renders one needs to ask. Narrowing the read to the write's domain would
make the touch row the one case a caller has to answer by hand — the caller-side
composition this API exists to remove.

Present bucket means `"override"`, including an empty one: an empty bucket is a
deliberate unbind, which is a customization rather than a default. An absent
bucket is `"default"` when the context declares the action and `"undeclared"`
when it does not. Whether a context declares an action is a property of the
action in that context, not of the platform — a context declaring only keyboard
bindings still reports `"default"` for gamepad.

The two rules collide when an action carries an override but the queried context
never declared it, because overrides are keyed by action while the query is
keyed by context. A context-scoped query answers `"undeclared"`: that context
has no `InputAction` for the action, since `createContext` builds one only where
the context's bindings and the core's action map agree, so the override does not
reach it and a row for it would be a row for something the context does not
have. Without a named context the gate does not apply and the override wins.
`getBindings` composes the override into its result in the same situation; that
is the pre-existing whole-action read and is left alone here.

"Declared" therefore means the same thing to `getBindingOrigin` and to
`getContextInfo().actions` — both defer to one predicate — because the former is
documented as removing the need to cross-reference the latter, and two APIs sold
as substitutes must not disagree.

`FluxCore`'s per-platform reads take four positional parameters, against the
repo's max-two rule. This is deliberate: every neighbouring method on the
interface (`rebindForPlatform`, `resetBindingsForPlatform`) is positional in the
same shape, and an options object for two of them would make the surface
inconsistent with itself. The rule still binds everything behind the interface,
where the resolvers all take options objects.

`getBindingsForPlatform(handle, action, platform, context?)` lands alongside it,
reading one platform's effective bindings from the same buckets. It is not
`getBindings` filtered by classification: a bucket holds whatever the player put
in it, so a gamepad key deliberately bound on the keyboard row is returned for
`"keyboard"`. `useBindings(action, platform?)` in the React wrapper reads
through it instead of filtering core's composed list caller-side, which is what
makes the hook reflect per-platform overrides rather than re-deriving them.

The free classification helper is therefore renamed `filterBindingsByPlatform`.
Two public exports named `getBindingsForPlatform` with deliberately different
answers is a trap that autocomplete springs: one asks what a binding _is_, the
other what the player _stored_. The names now say which.

Both rules — bucket wins, else the declared bindings classifying to that
platform — have one definition, `resolvePlatformBucket`, which whole-action
composition loops over and the single-platform read calls once. The bucket
lookup behind it is likewise shared, so `"override"` is reported exactly when a
bucket read returns something.

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
  boundary. `classifyBinding` is public and takes a raw `BindingLike`, and the
  free `getBindingsForPlatform` can be handed a list from a deserialized save
  that never passed through `createInputBinding`. `use-bindings.tsx` no longer
  calls it — the hook reads core's platform-scoped path instead — but the
  function stays public, so the boundary stays open. Since the function must
  stay total and `InputPlatform` must stay three values, a sourceless config
  there returns `"keyboard"`. That relocates the #199 hazard rather than
  removing it: a keyboard-scoped `rebindForPlatform` would sweep such a config
  up. Whoever validates loaded bindings on the way in closes it.
- `rebindForPlatform` accepts `"keyboard" | "gamepad"` only. `uiButton` holds a
  live `GuiButton` reference that cannot serialize, so a touch bucket containing
  one would not round-trip. Touch bindings are always preserved and never
  writable per-platform. Whether touch rebinding is coherent at all is deferred
  to its own research issue rather than half-answered here.
- `replayOverridesIntoContext` re-applies overrides wholesale when a context
  activates after a rebind, and needs the same per-platform treatment or
  platform state desyncs at exactly the moment a context comes online.
- `rebuildActionBindings` destroys every `InputBinding` child of an action with
  no filter. This ADR prescribed threading a platform predicate through it and
  through `destroyExistingBindings`; that was not built. A rebuild instead
  recomposes the action's full binding list from its platform buckets plus the
  bindings that context declares for the platforms with no bucket, and rewrites
  the lot. The instance layer stays platform-unaware and the unfiltered destroy
  is safe by construction rather than by a predicate that has to be correct —
  there is no filter to get wrong, and no second definition of what a platform's
  defaults compose to. Reviewed and accepted in preference to what this ADR
  originally called for.
- Binding order within a rebuilt action becomes a function of bucket iteration
  order rather than authored array order. It must be made deterministic —
  otherwise binding order is unstable across reloads, which is visible in any UI
  that lists bindings positionally.
- Three platform buckets multiply the states an action's overrides can be in.
  The empty-versus-absent contract is now load-bearing in three places per
  action instead of one, which is why it is tested rather than assumed.
