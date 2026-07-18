# Per-context action resolution

An action may be declared in any number of contexts, and each declaring context
gets its own `InputAction` instance (the engine requires per-context instances).
Reads must therefore resolve which instance supplies the value each frame: the
highest-priority active context that declares the action wins, with ties broken
by most recent activation. Accumulated action state (hold duration, trigger
progress) is keyed by action name and carries across a change of winning context
— contexts choose the raw-value source; they do not own the action's state.

Decided while triaging issue #128: the previous flat first-write-wins cache of
`InputAction` instances silently returned zero values once the first-declaring
context was disabled, and `pairs()` ordering made the winner nondeterministic.

## Considered Options

- **Merge values across enabled contexts** (max magnitude / first non-zero) —
  rejected: trigger and duration state become ambiguous, and it contradicts the
  documented "higher priority wins" model that sink already relies on.
- **First-enabled-in-list wins** — rejected: ignores priority, reintroducing an
  arbitrary winner at a different level.
- **Re-point a flat cache on context disable** — rejected: leaves resolution
  logic in enable/disable transitions and does not fix the subscribed-handle
  path, which discovers instances with the same first-wins scan.
- **Reset action state on winner change** — rejected: causes visible input
  hiccups (a held stick would drop mid-context-switch) and needs per-action
  winner bookkeeping for a case where continuity is the expected feel.

## Consequences

- Instance lookups are keyed `(context, action)`, not `action`; the
  priority-sorted pipeline reads each context's own instance, so resolution
  falls out of existing iteration order.
- Equal-priority ties require activation recency, so active contexts must be
  tracked in activation order, not as an unordered set.
- `canProcessAction` on subscribed handles must test the resolved context's
  instance, not mere presence of any instance under the action's name.
