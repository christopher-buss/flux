# Phase 2: Modifiers + Triggers

## Project Overview

Flux is an Input Action System wrapper for Roblox built with roblox-ts. It wraps
Roblox's `InputAction`, `InputBinding`, and `InputContext` APIs with a
declarative authoring layer. The core package (`@rbxts/flux`) is ECS-agnostic,
operating on opaque `InputHandle`s (branded numbers). This is a roblox-ts
project -- no default exports, uses Roblox globals (`Vector2`, `Vector3`,
`Enum`, etc.).

**Pipeline**: raw input -> modifiers -> triggers -> ActionState

## Prerequisites

Phase 1 must be complete. The following files must exist:

- `packages/core/src/types/actions.ts` -- ActionType, ActionConfig, ActionMap, type extractors
- `packages/core/src/types/bindings.ts` -- BindingLike
- `packages/core/src/types/contexts.ts` -- ContextConfig
- `packages/core/src/modifiers/types.ts` -- Modifier, ModifierContext (stub from Phase 1)
- `packages/core/src/triggers/types.ts` -- Trigger, TriggerState, TypedTrigger (stub from Phase 1)

## Target File Structure

After this phase, new/modified files:

```text
packages/core/src/
  modifiers/
    types.ts                    # (already exists as stub -- replace with full version)
    dead-zone.ts                # deadZone modifier
    negate.ts                   # negate modifier
    scale.ts                    # scale modifier
    index.ts                    # barrel export
    dead-zone.spec.ts           # tests
    negate.spec.ts              # tests
    scale.spec.ts               # tests
  triggers/
    types.ts                    # (already exists as stub -- replace with full version)
    hold.ts                     # hold trigger
    tap.ts                      # tap trigger
    double-tap.ts               # doubleTap trigger
    wrappers.ts                 # implicit, explicit, blocker
    index.ts                    # barrel export
    hold.spec.ts                # tests
    tap.spec.ts                 # tests
    double-tap.spec.ts          # tests
    wrappers.spec.ts            # tests
```

## Commands

All commands run from repo root:

```bash
pnpm typecheck          # type check all packages
pnpm build              # transpile TypeScript to Luau
pnpm dev:build          # build with test files included
pnpm test               # run jest-roblox tests
```

## Testing

Tests use jest-roblox. Import from `@rbxts/jest-globals`:

```ts
import { describe, expect, it } from "@rbxts/jest-globals";
```

Test files are `.spec.ts`, co-located with source files.

---

## Task 2.1: Modifier Interface + Helpers

### Task 2.1 Description

Replace the stub `modifiers/types.ts` with the full version, then implement
`deadZone`, `negate`, and `scale` modifier helpers.

### Task 2.1 Type Definitions

The `Modifier` and `ModifierContext` interfaces (replace the Phase 1 stub at
`packages/core/src/modifiers/types.ts`):

```ts
import type { InputHandle } from "../types/core";

export interface ModifierContext {
	readonly deltaTime: number;
	readonly handle: InputHandle;
}

export interface Modifier {
	modify(value: number, context: ModifierContext): number;
	modify(value: Vector2, context: ModifierContext): Vector2;
	modify(value: Vector3, context: ModifierContext): Vector3;
}
```

### Task 2.1 Files to Create

#### `packages/core/src/modifiers/dead-zone.ts`

Implement the `deadZone(threshold)` modifier:

- For `number`: if `math.abs(value) < threshold`, return 0. Otherwise rescale:
  `math.sign(value) * (math.abs(value) - threshold) / (1 - threshold)`.
- For `Vector2`: if `value.Magnitude < threshold`, return `Vector2.zero`.
  Otherwise rescale the magnitude: `value.Unit.mul((value.Magnitude - threshold) / (1 - threshold))`.
- For `Vector3`: same logic as Vector2 but with Vector3.
- **Important**: Use scaled output (rescale after threshold). There must be no
  jump discontinuity at the threshold boundary. The output range is `[0, 1]`
  when input range is `[threshold, 1]`.

```ts
import type { Modifier, ModifierContext } from "./types";

export function deadZone(threshold: number): Modifier {
	return {
		modify(
			value: number | Vector2 | Vector3,
			_context: ModifierContext,
		): number | Vector2 | Vector3 {
			if (typeIs(value, "number")) {
				if (math.abs(value) < threshold) {
					return 0;
				}

				return (math.sign(value) * (math.abs(value) - threshold)) / (1 - threshold);
			}

			if (typeIs(value, "Vector2")) {
				if (value.Magnitude < threshold) {
					return Vector2.zero;
				}

				return value.Unit.mul((value.Magnitude - threshold) / (1 - threshold));
			}

			// Vector3
			const v3 = value as Vector3;
			if (v3.Magnitude < threshold) {
				return Vector3.zero;
			}

			return v3.Unit.mul((v3.Magnitude - threshold) / (1 - threshold));
		},
	};
}
```

#### `packages/core/src/modifiers/negate.ts`

Negates the input value.

```ts
import type { Modifier, ModifierContext } from "./types";

export function negate(): Modifier {
	return {
		modify(
			value: number | Vector2 | Vector3,
			_context: ModifierContext,
		): number | Vector2 | Vector3 {
			if (typeIs(value, "number")) {
				return -value;
			}

			if (typeIs(value, "Vector2")) {
				return value.mul(-1);
			}

			return (value as Vector3).mul(-1);
		},
	};
}
```

#### `packages/core/src/modifiers/scale.ts`

Scales the input value by a constant factor.

```ts
import type { Modifier, ModifierContext } from "./types";

export function scale(factor: number): Modifier {
	return {
		modify(
			value: number | Vector2 | Vector3,
			_context: ModifierContext,
		): number | Vector2 | Vector3 {
			if (typeIs(value, "number")) {
				return value * factor;
			}

			if (typeIs(value, "Vector2")) {
				return value.mul(factor);
			}

			return (value as Vector3).mul(factor);
		},
	};
}
```

#### `packages/core/src/modifiers/index.ts`

```ts
export { deadZone } from "./dead-zone";
export { negate } from "./negate";
export { scale } from "./scale";
export type { Modifier, ModifierContext } from "./types";
```

#### Task 2.1 Test Files

**`packages/core/src/modifiers/dead-zone.spec.ts`**:

Test cases:
- `number` below threshold returns 0
- `number` above threshold returns rescaled value (no jump at threshold)
- `number` at threshold boundary returns 0 (just below) or near-zero (just above)
- `Vector2` below threshold returns `Vector2.zero`
- `Vector2` above threshold returns rescaled vector
- `Vector3` below threshold returns `Vector3.zero`
- `Vector3` above threshold returns rescaled vector
- Output at input=1.0 should be 1.0 (full range preserved)
- Negative numbers handled correctly

**`packages/core/src/modifiers/negate.spec.ts`**:

Test cases:
- Negates positive and negative numbers
- Negates Vector2
- Negates Vector3

**`packages/core/src/modifiers/scale.spec.ts`**:

Test cases:
- Scales number by factor
- Scales Vector2 by factor
- Scales Vector3 by factor
- Factor of 0 returns zero
- Factor of 1 returns original value

### Task 2.1 Acceptance Criteria

- [ ] `Modifier` interface has typed `modify()` overloads for number, Vector2, Vector3
- [ ] `deadZone(threshold)` uses scaled output with no jump discontinuity
- [ ] `negate()` negates all value types
- [ ] `scale(factor)` scales all value types
- [ ] All tests pass
- [ ] `pnpm typecheck` passes

### Task 2.1 Verification

```bash
pnpm typecheck
pnpm test
```

---

## Task 2.2: Trigger Interface + Helpers

### Task 2.2 Description

Replace the stub `triggers/types.ts` with the full version, then implement
`hold`, `tap`, `doubleTap` triggers and `implicit`/`explicit`/`blocker`
wrappers.

### Task 2.2 Dependencies

- Task 2.1 should be complete (but triggers are independent of modifiers)

### Task 2.2 Type Definitions

The trigger types (replace the Phase 1 stub at
`packages/core/src/triggers/types.ts`):

```ts
export type TriggerState = "canceled" | "none" | "ongoing" | "triggered";

export interface Trigger {
	reset(): void;
	update(magnitude: number, duration: number, deltaTime: number): TriggerState;
}

export type TriggerType = "blocker" | "explicit" | "implicit";

export interface TypedTrigger {
	readonly trigger: Trigger;
	readonly type: TriggerType;
}
```

### Magnitude Approach

Triggers receive a `magnitude` instead of a boolean `pressed` flag:

- **Bool actions** pass `0` or `1`
- **Axis actions** pass the vector length (e.g., `Vector2.Magnitude`)
- Triggers gate whether the action fires -- they do not modify the value
- This follows Unreal Engine's Enhanced Input approach

### Task 2.2 Files to Create

#### `packages/core/src/triggers/hold.ts`

```ts
import type { Trigger, TriggerState } from "./types";

export interface HoldOptions {
	/** Minimum duration before "ongoing" state begins. */
	readonly attempting: number;
	/** If true, only triggers once until released. */
	readonly oneShot?: boolean;
	/** Duration required to trigger. */
	readonly threshold: number;
}

export function hold({ attempting, oneShot, threshold }: HoldOptions): Trigger {
	let hasTriggered = false;

	return {
		reset(): void {
			hasTriggered = false;
		},

		update(magnitude: number, duration: number, _deltaTime: number): TriggerState {
			if (magnitude === 0) {
				const wasTrying = duration > attempting && !hasTriggered;
				hasTriggered = false;
				return wasTrying ? "canceled" : "none";
			}

			if (duration >= threshold) {
				if (!hasTriggered || oneShot !== true) {
					hasTriggered = true;
					return "triggered";
				}

				return "none";
			}

			return "ongoing";
		},
	};
}
```

#### `packages/core/src/triggers/tap.ts`

```ts
import type { Trigger, TriggerState } from "./types";

export interface TapOptions {
	/** Maximum duration to count as a tap. */
	readonly threshold: number;
}

export function tap({ threshold }: TapOptions): Trigger {
	return {
		reset(): void {
			// no-op
		},

		update(magnitude: number, duration: number, _deltaTime: number): TriggerState {
			if (magnitude === 0 && duration > 0 && duration < threshold) {
				return "triggered";
			}

			return magnitude > 0 ? "ongoing" : "none";
		},
	};
}
```

#### `packages/core/src/triggers/double-tap.ts`

```ts
import type { Trigger, TriggerState } from "./types";

export interface DoubleTapOptions {
	/** Maximum time between taps. */
	readonly window: number;
}

export function doubleTap({ window: tapWindow }: DoubleTapOptions): Trigger {
	let lastTapTime = 0;
	let tapCount = 0;

	return {
		reset(): void {
			lastTapTime = 0;
			tapCount = 0;
		},

		update(magnitude: number, _duration: number, _deltaTime: number): TriggerState {
			const now = os.clock();

			if (magnitude > 0) {
				if (now - lastTapTime < tapWindow) {
					tapCount += 1;
					if (tapCount >= 2) {
						tapCount = 0;
						return "triggered";
					}
				} else {
					tapCount = 1;
				}

				lastTapTime = now;
			}

			return "none";
		},
	};
}
```

#### `packages/core/src/triggers/wrappers.ts`

```ts
import type { Trigger, TypedTrigger } from "./types";

export function implicit(trigger: Trigger): TypedTrigger {
	return { trigger, type: "implicit" };
}

export function explicit(trigger: Trigger): TypedTrigger {
	return { trigger, type: "explicit" };
}

export function blocker(trigger: Trigger): TypedTrigger {
	return { trigger, type: "blocker" };
}
```

#### `packages/core/src/triggers/index.ts`

```ts
export { doubleTap } from "./double-tap";
export type { DoubleTapOptions } from "./double-tap";
export { hold } from "./hold";
export type { HoldOptions } from "./hold";
export { tap } from "./tap";
export type { TapOptions } from "./tap";
export type { Trigger, TriggerState, TriggerType, TypedTrigger } from "./types";
export { blocker, explicit, implicit } from "./wrappers";
```

#### Task 2.2 Test Files

**`packages/core/src/triggers/hold.spec.ts`**:

Test cases:
- Returns `"none"` when magnitude is 0 and no prior input
- Returns `"ongoing"` while held but below threshold duration
- Returns `"triggered"` when duration reaches threshold
- With `oneShot: true`, returns `"triggered"` once then `"none"`
- Returns `"canceled"` when released after attempting but before threshold
- `reset()` clears the hasTriggered state

**`packages/core/src/triggers/tap.spec.ts`**:

Test cases:
- Returns `"ongoing"` while magnitude > 0
- Returns `"triggered"` on release if duration < threshold
- Returns `"none"` on release if duration >= threshold
- Returns `"none"` when magnitude is 0 and no prior duration

**`packages/core/src/triggers/double-tap.spec.ts`**:

Test cases:
- Returns `"none"` on first tap
- Returns `"triggered"` on second tap within window
- Returns `"none"` if second tap is outside window (resets to first tap)
- `reset()` clears tap count and timing

**`packages/core/src/triggers/wrappers.spec.ts`**:

Test cases:
- `implicit()` wraps a trigger with type `"implicit"`
- `explicit()` wraps a trigger with type `"explicit"`
- `blocker()` wraps a trigger with type `"blocker"`
- Wrapped trigger is the same object reference

### Task 2.2 Acceptance Criteria

- [ ] `Trigger` interface with `update(magnitude, duration, deltaTime)` and `reset()`
- [ ] `TypedTrigger` wraps a `Trigger` with `"implicit" | "explicit" | "blocker"` type
- [ ] `hold({ attempting, oneShot, threshold })` implemented correctly
- [ ] `tap({ threshold })` implemented correctly
- [ ] `doubleTap({ window })` implemented correctly
- [ ] `implicit()`, `explicit()`, `blocker()` wrapper helpers exported
- [ ] All tests pass
- [ ] `pnpm typecheck` passes

### Task 2.2 Verification

```bash
pnpm typecheck
pnpm test
```

---

## Phase 2 Checkpoint

All of the following must be true before moving to Phase 3:

- [ ] `Modifier` interface has typed overloads for number, Vector2, Vector3
- [ ] `deadZone`, `negate`, `scale` modifiers implemented with tests
- [ ] `deadZone` uses rescaled output (no jump discontinuity at threshold)
- [ ] `Trigger` interface uses magnitude-based approach
- [ ] `hold`, `tap`, `doubleTap` triggers implemented with tests
- [ ] `implicit`, `explicit`, `blocker` wrappers implemented with tests
- [ ] All modifier and trigger types exported from barrel files
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] No `any` casts in any source file
