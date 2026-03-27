## API Reference

See `docs/core-api-proposal.md` for the full API design.

## Constraints

**InputContexts Ownership**: InputContext instances MUST be descendants of Player
instance in DataModel for Roblox network ownership.

**Context Priority**: Lower numbers = lower priority. UI contexts typically use
high priority + sink to block gameplay input.

**Shared Bindings**: Same key can map to different actions in different contexts
(e.g., ButtonR2 = "accelerate" in driving, "attack" in gameplay). Only active
context receives input.

**Core is ECS-agnostic**: Core uses opaque `InputHandle`s. JECS integration is a
separate wrapper layer that maps entities ↔ handles.
