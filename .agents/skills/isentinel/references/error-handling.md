---
name: error-handling
description: |
    Use when deciding between assertions and errors, or implementing
    defense-in-depth validation
metadata:
    author: Christopher Buss
    version: "2026.1.29"
---

# Error Handling

## Philosophy

**Fail fast, fail loud.** Prefer assertions over silent failing.

- Silent failures hide bugs
- Assertions surface problems immediately
- Better to crash in development than fail silently in production

## Assertions vs Guard Clauses

**Prefer assertions over guard clauses.** Guard clauses silently return, hiding
bugs.

```ts
// ❌ BAD: Guard clause hides the bug
function damagePlayer(world: World, entity: Entity, amount: number): void {
	const health = world.get(entity, HealthComponent);
	if (!health) {
		// Silent failure - why is health missing?
		// If entity can be damaged, it must have health
		return;
	}

	world.set(entity, HealthComponent, health - amount);
}

// ✅ GOOD: Assertion surfaces the bug
function damagePlayer(world: World, entity: Entity, amount: number): void {
	const health = world.get(entity, HealthComponent);
	assert(health, "Cannot damage entity without HealthComponent");
	world.set(entity, HealthComponent, health - amount);
}
```

**Only use guard clauses when:**

- The undefined/null case is legitimately expected (optional data)
- You have explicit handling logic for that case
- The caller expects and handles the fallback value

If you can't explain _why_ the value might be undefined, use an assertion.

## Assertions vs Errors

**Critical distinction:** Choose based on failure category.

### `assert()` for programmer errors

Conditions that should NEVER happen if code is correct:

- Missing expected component on entity
- Invalid internal state transitions
- Design contract violations

Assertions also **document intent** for other developers:

```ts
const health = entity.get(HealthComponent);
assert(health !== undefined, "Entity missing required HealthComponent");
// ^ Tells developers: entities ALWAYS have health at this point
```

### `throw new Error()` for runtime failures

External/unpredictable failures (import from `@rbxts/luau-polyfill`):

- Asset loading failures
- Network request failures
- External data corruption
- Player-provided data validation

```ts
import { Error } from "@rbxts/luau-polyfill";

if (!assetExists(assetId)) {
	throw new Error(`Required asset not found: ${assetId}`);
}
```

## Type Guards vs Data Validation

Flamework type guards validate **types** but not **data integrity**.

```ts
// Type guard guarantees petName is string
// BUT exploiters can send malformed UTF-8, NaN, or oversized strings
events.connect((player, petName) => {
	// Flamework handled: petName is string
	// Still need to validate:
	if (!utf8.len(petName)) {
		throw new Error("Invalid UTF-8 string"); // Prevents DataStore exploit
	}
});
```

**Type safety ≠ Data safety:** Type guards catch `string` vs `number`, but not
malformed UTF-8, NaN, or size limits that break DataStores.

## Defense-in-Depth

Validate at **every layer** data passes through. Make bugs structurally
impossible.

| Layer       | Purpose                               | Example                       |
| ----------- | ------------------------------------- | ----------------------------- |
| Entry       | Reject invalid input at API boundary  | UTF-8 validation, size limits |
| Business    | Ensure data makes sense for operation | Ownership checks, existence   |
| Environment | Prevent dangerous context operations  | No client DataStore writes    |
| Debug       | Capture context for forensics         | Stack traces, data logging    |

Single validation: "We fixed the bug" Multiple layers: "We made the bug
impossible"

## Result Pattern

For operations that can legitimately fail:

```ts
type Result<T, E = string> = { error: E; success: false } | { success: true; value: T };
```
