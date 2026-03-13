---
name: core-query-design
description:
    Use when designing queries that span multiple entities, need relationship
    traversal, or answer "interesting questions" about game state.
---

# Query Design for Complex Questions

Queries answer questions. Simple questions involve one entity. Interesting
questions involve multiple entities connected by relationships.

## Decomposing Questions into Constraints

Every query is a list of constraints that progressively narrows results:

**Question:** "Which vendors in this city sell healing potions?"

| Constraint             | Remaining Entities |
| ---------------------- | ------------------ |
| Is a vendor            | [all vendors]      |
| In same city as player | [vendors in city]  |
| Sells healing potions  | [answer]           |

Each constraint eliminates entities quickly—this is why ECS queries are
efficient.

## When You Need Multiple Entities

If your question involves phrases like "that belongs to," "in the same X as," or
"related to," you need to join data across entities:

```typescript
// "Find allies at war with someone"
// Entities: my faction, ally faction, their enemy
for (const [id, faction] of world.query(Faction).with(pair(AlliedWith, allyId))) {
	// Now check: does allyId have AtWar relationship?
	if (world.has(allyId, AtWar)) {
		// This ally is at war
	}
}
```

## Forward vs Reverse Lookups

| Access Pattern    | Solution                          | Example                    |
| ----------------- | --------------------------------- | -------------------------- |
| Child → Parent    | Entity member or `world.target()` | Get item's owner           |
| Parent → Children | Relationship query                | Get all items in inventory |
| Unknown depth     | Manual traversal or observers     | Find inherited Style       |

```typescript
// Forward: child knows parent
const parent = world.target(child, ChildOf);

// Reverse: find all children of parent
for (const [id] of world.query(Transform).with(pair(ChildOf, parentId))) {
	// Each child entity
}
```

## Hierarchy Traversal

For inherited properties (Style, Transform), traverse upward until found:

```typescript
function getInheritedStyle(entity: Entity): Style | undefined {
	let current: Entity | undefined = entity;

	while (current !== undefined) {
		const style = world.get(current, Style);
		if (style) {
			return style;
		}

		current = world.target(current, ChildOf);
	}

	return undefined;
}
```

<!--
Source references:
- https://ajmmertens.medium.com/why-it-is-time-to-start-thinking-of-games-as-databases-e7971da33ac3
-->
