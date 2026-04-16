## API Reference

See `docs/core-api-proposal.md` for the full API design.

## Constraints

**InputContexts Ownership**: For server-authoritative experiences, InputContexts
must be descendants of a Player so the engine knows ownership. Use
`core.register(parent, ...)` on the server to create instances that replicate.
Use `core.subscribe(parent, ...)` on the client to find server-created instances
via FindFirstChild + ChildAdded. Use `core.register(parent, ...)` on the client
for local-only input.

**Context Priority**: Lower numbers = lower priority. UI contexts typically use
high priority + sink to block gameplay input.

**Shared Bindings**: Same key can map to different actions in different contexts
(e.g., ButtonR2 = "accelerate" in driving, "attack" in gameplay). Only active
context receives input.

**Core is ECS-agnostic**: Core uses opaque `InputHandle`s. JECS integration is a
separate wrapper layer that maps entities ↔ handles.

**Error handling**: All errors are programmer mistakes (invariant violations),
not recoverable conditions. Never use custom Error classes — roblox-ts compiles
`throw obj` to `error(table)`, which Roblox displays as "Error occurred, no
output from Luau." Use `assert(condition, "message")` for plain string messages.
Use `if (!condition) error(\`interpolated ${value}\`)` when the message needs
interpolation, since `assert` eagerly evaluates its second argument.
