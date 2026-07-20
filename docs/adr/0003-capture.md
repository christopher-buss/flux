# Capture: standing, owned action ownership

A **capture** is a standing, exclusive, reader-side hold on one action, acquired
at a session boundary and held until released. `state.capture(action, options?)`
returns a token that _is_ a scoped reader (`token.pressed()`, `token.axis2d()`,
`token.claim()`, `token.release()`); possessing the token is the read-through
permission. Every other consumer reads the action as inert until release; `raw*`
bypasses captures exactly as it bypasses claims.

Flux had no way to say "this consumer owns this action for the next several
frames". Consumers approximated it by re-claiming every frame from a step whose
schedule position had to sit between `core.update` and the UI flush — an
invisible ordering invariant, and the bug class behind issue #129. Decided while
designing the focus layer in issue #132; capture extends ADR 0001's centralized
read gate rather than replacing it.

The three arbitration primitives divide by granularity × lifetime × arbitration:

| Primitive      | Granularity         | Lifetime     | Arbitrated by             |
| -------------- | ------------------- | ------------ | ------------------------- |
| Context + sink | everything below it | while active | structure (priority)      |
| Claim          | one action          | one frame    | position (schedule order) |
| Capture        | one action          | a session    | acquisition (newest wins) |

Contexts arbitrate which binding _supplies_ an action's value (ADR 0002); claims
and captures arbitrate which consumer _sees_ it. Suppression becomes
`claimed || (captured && viewer !== topHolder)`.

Captures stack LIFO — each widget captures on mount, only the top token reads
real state, shadowed tokens read inert, and out-of-order release is silent
(React unmount order is not guaranteed). Releasing the top restores the next
holder the same frame, with no unowned gap. Core tracks no caller identity; a
fresh token per `capture()` call, with re-render dedup left to `useCapture`.

Edges across a capture boundary:

- `release()` **drains** the in-flight press — suppression persists until
  magnitude 0, so the press never leaks to whoever is underneath. Modeled as a
  capture held by nobody, so a new `capture()` mid-drain reads through: handoff
  happens by capturing, never by leaky release. Only kinds whose value rests at
  zero can be in flight, so a `ViewportPosition` boundary neither drains nor
  cancels.
- No synthesized `justReleased` — a completed release and an interrupted press
  are different events. Instead `canceled()` reads true for exactly one frame
  for the viewer whose in-flight view was force-dropped (gameplay at
  acquisition, a newly shadowed holder, or a holder that released mid-press). A
  claimed frame eats the cancel like any other processed read.
- A restored holder drains too — no synthesized `justPressed`.

Introspection is dev-mode only: `state.debugCaptures(action)` returns the stack
as `{ label?, traceback }`, empty outside `_G.__DEV__`. There is no public
`isCaptured` — game code branching on capture status is a hand-rolled priority
system.

Capture is per-handle and does not replicate; `unregister` drops every capture
held on that handle, restoring shadowed tokens beneath it per the LIFO rules. On
subscribed handles a capture arbitrates locally only. flux-jecs needs no
capture-specific surface — entity ids already _are_ handles and the token is
held in a closure or the consumer's own component.

## Considered options

- **Priority-integrated capture** (a tier dimension, so gameplay could outrank a
  UI holder) — rejected: a scenario sweep (cutscene takeover, death, stun,
  spectator, tutorials, QTEs, AFK observers, server validation) found no case
  where "gameplay needs the action back" is a different event from "the UI
  stopped being focused"; the right mechanism is release-on-focus-exit.
  Outranking would produce a visibly-focused button that silently does nothing.
  Observers are served by `raw*`. `capture(action, options?)` is reserved so a
  tier stays backward-compatible.
- **A flux-react-owned per-frame claim asserter** (no core change) — rejected:
  this is what consumers run today, it keeps the invisible schedule-placement
  invariant, and under ADR 0001 the asserter's own anonymous claim blinds the
  UI's flush-time reads, forcing a shadow reimplementation of read semantics in
  the wrapper. Valid as an interim, wrong as the permanent shape.
- **Context/source-side ownership** (a dedicated context, or per-action sink) —
  rejected as a category error: one action name is one shared state entry, so no
  context arrangement can hide `confirm` from gameplay readers.
- **Single holder, reject the second capture** — rejected: the second widget
  silently gets nothing while the outer surface keeps eating the action. Silent
  misownership beats no stack only on implementation cost.
- **Bool-only token surface / viewer-parameter threading** — rejected: the gate
  already threads a viewer through one helper, so the full surface is near-free,
  and a reader-object token makes "forgot to thread the viewer" and action/token
  mismatch unrepresentable.
- **A movement-delta or instant-settle drain terminator for `ViewportPosition`**
  — rejected: both dress up "never drains" as a threshold. Delta needs a
  rest-detection window nothing else in the pipeline has, and instant-settle is
  a no-drain release that still pays a frame of suppression. Neither buys
  anything, because there is no in-flight press to withhold.
- **`release({ immediate: true })`** — rejected for now: no consumer evidence
  for mid-press handoff, and the flag re-enables the exact leak the drain plugs.
  `release(options?)` reserved.

## Consequences

- `justReleased` is lossy by contract across a capture boundary. ADR 0001's "an
  unclaimed release frame is visible downstream" holds per-frame only;
  state-driven readers degrade gracefully and `canceled()` is the interruption
  hook.
- One `canceledFor` slot per action, set at the boundary. Two boundaries in one
  frame overwrite it — last wins, documented rather than queued. The slot
  expires on delivery, not on the frame reset: a capture is acquired from
  consumer code, and `endFrame` runs first inside `core.update`, so clearing at
  the reset would silently drop every boundary recorded before the next update.
  An unread cancel is instead carried across exactly one reset — enough for the
  read phase to see it, bounded so a stale cancel cannot surface frames later. A
  claimed frame counts as delivered.
- That gives the displaced viewer's own `canceled()` read a side effect, the
  shape ADR 0001 rejected for claims because a debug overlay would eat input. It
  is reintroduced deliberately and bounded: only the displaced viewer's read
  consumes the slot, and a stray read merely shortens the window from two resets
  to one, with the earliest clear still a full frame boundary away — so a
  per-frame poller cannot be starved, though a sub-frame-rate poller can miss a
  cancel.
- The drain terminates on magnitude, not trigger state: custom triggers can
  leave `triggered` while the button is still physically down.
- "In flight" is per action kind, not universal. Magnitude answers it only for
  values that rest at zero; a `ViewportPosition` rests wherever the pointer
  sits, so its magnitude is distance from pixel (0, 0) and a drain on one would
  suppress the action forever. Position kinds are therefore never in flight,
  which settles both boundaries at once: releasing one neither drains nor
  cancels, and capturing one cancels nobody. There is no interaction to
  withhold, only a coordinate whoever reads next should already see.
- Capture ownership is ordering-free, so `useCapture` needs no schedule slot.
  Per-frame `claim()` stays positional — but `token.claim()` from a React effect
  cannot suppress same-frame subscription reads (selectors evaluate before
  effects), so quieting the cancel is a systems-side affordance.
- The cost of absoluteness is leak debuggability, which `debugCaptures` pays
  for. No proactive leak warning ships: a settings menu legitimately holds
  `confirm` for minutes, so no threshold separates a leak from correct use.
