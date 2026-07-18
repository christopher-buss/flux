# Claim-aware reads: claim is a manual sink, raw is the only bypass

A claim marks an action's input as consumed for the rest of the frame, so all
processed reads (`justPressed`, `pressed`, `justReleased`, `triggered`,
`ongoing`, `canceled`, axis/direction/position reads, `getState`, durations)
return false/neutral for a claimed action. Previously only
`isAvailable`/`isClaimed` respected claims, making exclusivity an opt-in
convention (`isAvailable(x) && justPressed(x)`) that consumers silently forgot
(issue #129). `raw*` reads are the sole bypass: "raw" means pre-arbitration —
before triggers _and_ claims.

The intended idiom is read-then-claim, with priority coming from system
ordering:

```ts
if (input.justPressed("interact") && input.claim("interact")) {
	// act — downstream consumers now see the action as inert
}
```

Claim only what you used. "This consumer owns the action regardless of input" is
a context + sink job, not a claim.

## Considered options

- **Claim-aware convenience read** (`justPressedAvailable`, `consume()`):
  rejected — read-then-claim is already one greppable expression, and a
  `consume` variant would have to be replicated across every read kind.
- **Auto-consume via `exclusive: true` action config** (from the pre-1.0 design
  sketches): rejected — consume-on-first-read makes reads side-effectful (a
  debug overlay would eat input) and implements first-reader-wins when the model
  wants first-claimer-wins. The sketch itself recommended manual `claim()` for
  conditional use ("only claim if target is valid").
- **Docs-only** (mandate the `isAvailable &&` idiom): rejected — the failure
  mode is silent double-firing; safe-by-default beats convention.

## Consequences

- Claiming _before_ reading suppresses your own reads — the claimed flag is
  anonymous, with no owner identity. Read-then-claim is the contract, not a
  style preference.
- Claims are per-frame (`endFrame` clears them). Consumers of continuous input
  (holds, axes) must re-claim each frame they consume; an unclaimed release
  frame is visible downstream even if the press frame was claimed
  (`justReleased` without `justPressed` is by design).
- Claims made before `core.update()` are wiped by that update's frame reset.
  Read-then-claim already forces claiming after update, since there is nothing
  to read before it.
