# Per-handle trigger state

Triggers are declared as **factories**, not instances. `hold`, `tap` and
`doubleTap` return `TriggerFactory` (`() => Trigger`); `implicit`/`explicit`/
`blocker` carry that factory on `TypedTrigger.create`. Each handle mints its own
`TriggerInstance` set when it registers, and the pipeline evaluates the caller's
instances rather than anything reachable from the action config.

An action config is written once and shared by every handle on a core. A trigger
that keeps state in a closure therefore kept _one_ flag for all of them: with a
one-shot hold, whichever handle was updated first consumed the fire and every
other handle read `none` that frame. A server-authoritative core driving a
handle per player is the common shape, so the bug scaled with the player count.
Found during an architecture review, issue #225.

The state cannot be cloned out of a closure after the fact, so the split has to
happen where the closure is created — the factory is the only seam that exists.
That is why the authoring syntax is unchanged (`implicit(hold({ ... }))`) while
the type it produces is not.

## `reset()` fires when an action stops being evaluated

`Trigger.reset` had no call sites. It is now called wherever core already zeroes
an action's duration: no active context declares the action, or its
`InputAction` instance has not replicated yet.

Release is deliberately _not_ a reset point. `doubleTap` measures the gap
between two presses, so clearing its state on release would make a double tap
unreachable. Triggers that want release semantics already see `magnitude === 0`
in `update` — `hold` uses exactly that to decide `canceled` versus `none`.
