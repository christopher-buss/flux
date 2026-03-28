## API Reference

See `docs/core-api-proposal.md` for the full API design.

## Constraints

**InputContexts Ownership**: For server-authoritative experiences, InputContext
instances must be descendants of a Player so the engine knows input ownership.
StarterGui works because it replicates to PlayerGui under each Player. For
client-only input, ReplicatedStorage or StarterGui both work.

**Context Priority**: Lower numbers = lower priority. UI contexts typically use
high priority + sink to block gameplay input.

**Shared Bindings**: Same key can map to different actions in different contexts
(e.g., ButtonR2 = "accelerate" in driving, "attack" in gameplay). Only active
context receives input.

**Core is ECS-agnostic**: Core uses opaque `InputHandle`s. JECS integration is a
separate wrapper layer that maps entities ↔ handles.
