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

**Core is ECS-agnostic — keep it that way.** Core speaks opaque `InputHandle`s;
the entity ↔ handle mapping lives in the JECS wrapper, never in core.
