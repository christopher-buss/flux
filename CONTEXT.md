# Flux

Domain glossary for Flux, a type-safe Input Action System wrapper for Roblox.
Flux sits between raw Roblox input and gameplay code: consumers register for
named **actions**, the active **contexts** decide which physical inputs map to
them, and a per-frame **pipeline** turns raw input into queryable **action
state**.

This file is a glossary, not a spec. It defines what terms mean, not how the
code implements them.

## Language

### Actions & values

**Action**: A named, typed input intent a consumer can query — e.g. `jump`,
`move`, `aim`. An action declares an **action type** and the **triggers** and
**modifiers** that shape it; it is not itself a key. _Avoid_: input, command,
event, control.

**Action type**: The value shape an action produces: `Bool`, `Direction1D`,
`Direction2D`, `Direction3D`, or `ViewportPosition`. Mirrors Roblox
`InputAction.Type`. _Avoid_: value kind, signal type.

**Action state**: The per-frame, queryable result of an action for one handle —
`pressed`, `justPressed`, `axis2d`, `triggered`, `canceled`, and so on. The read
side of Flux. _Avoid_: input state, snapshot, result.

**Raw input**: An action's value bypassing Flux's gating entirely — read before
_trigger_ evaluation and ignoring _claims_ (`rawPressed`, `rawJustPressed`);
modifiers still apply. The unarbitrated truth, distinct from the processed value
most code reads. _Avoid_: live input, direct input, unprocessed input.

### Bindings & contexts

**Binding**: A mapping from a physical input (a `KeyCode`, GUI button, or set of
directional keys) to an action. The same key can be a different action in a
different context. _Avoid_: keybind, mapping, control, hotkey.

**Rebind**: Replacing an action's bindings at runtime. The customized result is
a **binding override**, which is serialized sparsely for persistence and merged
back over the code-defined defaults on load. Overrides are keyed by action _and_
platform, so rebinding one device leaves the others alone. _Avoid_: remap,
reassign.

**Platform**: The class of device a binding targets — `keyboard`, `gamepad`, or
`touch`. A property of the binding, derived from it rather than declared: a
`ButtonA` binding is a gamepad binding wherever it appears. Distinct from a
_context_, which groups bindings by situation rather than by hardware; an action
can be bound on several platforms in the same context. _Avoid_: device, scheme,
input type, input method.

**Unbound**: An action a player deliberately cleared, per platform — distinct
from one that merely has no override and so uses its code-defined default, and
from one a context never declared. All three read back differently: unbound
renders as an empty slot the player can refill, an undeclared action renders as
nothing at all. _Avoid_: empty, cleared, disabled, unassigned.

**Context**: A named set of bindings with a **priority** and a **sink** flag.
Only active contexts feed input to a handle; activating a context is how Flux
switches between gameplay, UI, vehicle, etc. _Avoid_: scheme, layer, mode,
profile, mapping.

**Priority**: Ordering of contexts — a higher number receives input first. UI
contexts typically run high priority. _Avoid_: rank, weight, z-index.

**Sink**: A context flag that, when set, stops lower-priority contexts from
receiving the input it consumes. How a UI context blocks gameplay input
underneath it. _Avoid_: block, swallow, capture, absorb.

**Resolution**: Choosing which context supplies an action's value each frame
when several declare it. An action may be declared in any number of contexts;
reads resolve to the highest-priority active context that declares it, with ties
going to the most recently activated. Action state survives a change of winning
context. _Avoid_: arbitration, fallback, merging.

**Winning context**: The context an action resolved to this frame. _Avoid_:
owner, source context.

### Triggers & modifiers

**Trigger**: A stateful gate deciding _when_ an action fires from input
magnitude and timing — e.g. tap, hold, double-tap. Evaluates to a **trigger
state** each frame. _Avoid_: condition, gate, rule.

**Trigger state**: The outcome of a trigger this frame: `none`, `ongoing`,
`triggered`, or `canceled`. _Avoid_: phase, status.

**Trigger type**: How a trigger participates in evaluating its action:
`implicit` (all must pass), `explicit` (any one fires), or `blocker` (prevents
firing). _Avoid_: trigger mode, combinator.

**Modifier**: A stateless value transform applied to an action's value _before_
triggers — e.g. dead-zone, negate, scale. _Avoid_: filter, transform, processor.

**Pipeline**: The per-frame path a value takes: raw input → modifiers → triggers
→ action state. _Avoid_: chain, flow, stack.

### Consumers & handles

**Consumer**: Anything that registers for input and reads action state — a
player, an ECS entity, a UI panel. Core knows consumers only through their
handle. _Avoid_: subscriber, listener, owner, actor.

**Handle**: An opaque identifier (`InputHandle`) for a registered consumer. Core
operates on handles, never on players or entities directly; integration layers
(JECS, React) map their own concepts to handles. _Avoid_: id, entity, player,
token.

**Owned handle**: A handle created by `register` — Flux created the underlying
IAS instances for it and drives them. The authoritative or local-input side.
_Avoid_: local handle, server handle.

**Subscribed handle**: A handle created by `subscribe` — it attaches to
server-created IAS instances rather than owning them, and cannot serialize
bindings. The replication side. _Avoid_: remote handle, mirror handle, client
handle.

**Claim**: Marking an action's input as consumed for the rest of the frame — a
manual sink. A consumer claims only _after_ reading and using the input
(read-then-claim); once claimed, the action reads as inert (false/neutral) to
later consumers, and only raw reads see through it. Per-frame: continuous
consumers re-claim each frame they use the input. Session-lived ownership is a
_capture_, not a long-lived claim. _Avoid_: lock, reserve, grab, exclusive
ownership.

**Capture**: A standing, owned hold on an action, spanning a session (e.g.
focus-enter to focus-exit) rather than a frame. The holder keeps reading the
action's real state; every other consumer reads it as inert until release, and
only raw reads see through. Where a _claim_ is anonymous and arbitrated by
schedule position, a capture is owned and arbitrated by acquisition — declared
at a session boundary, held until released. Captures stack: the newest ownership
statement wins, and releasing it restores the one beneath. Mirrors the engine's
`CaptureFocus`/`ReleaseFocus`. _Avoid_: lease, reservation, hold, lock, standing
claim.
