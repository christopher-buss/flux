# Core API Proposal

## Goal

Define the proposed Flux core API as a wrapper over Roblox `InputAction`,
`InputBinding`, and `InputContext`.

This document covers core authoring and runtime only.

- No JECS wrapper
- No React wrapper
- No internal implementation details
- Type-safe generics throughout (see Type Safety section)

## Design Rules

1. Align with Roblox naming where concepts map 1:1.
2. Add Flux-specific names only for behavior Roblox does not provide directly.
3. Allow both named imports and `Flux.*` namespace usage.
4. Make convenience wrappers optional, not required.
5. Keep action authoring readable for broad API coverage.

## Public Exports

Flux should support both styles:

```ts
import {
	action,
	bool,
	createCore,
	defineActions,
	defineContexts,
	direction1d,
	direction2d,
	direction3d,
	position2d,
} from "@rbxts/flux";
```

```ts
import { Flux } from "@rbxts/flux";
```

Both should expose the same functionality.

## Action Definition

The canonical low-level API is `action({ type })`.

```ts
const actions = defineActions({
	aim: action({
		type: "ViewportPosition",
	}),

	heavyAttack: action({
		triggers: [implicit(hold({ attempting: 0.2, oneShot: true, threshold: 0.5 }))],
		type: "Bool",
	}),

	jump: action({
		type: "Bool",
	}),

	move: action({
		modifiers: [deadZone(0.1)],
		type: "Direction2D",
	}),
});
```

Optional convenience wrappers should be aliases over `action({ type })`:

```ts
const actions = defineActions({
	aim: position2d(),
	jump: bool(),
	move: direction2d({ modifiers: [deadZone(0.1)] }),
});
```

## Action Config Shape

```ts
type ActionType = "Bool" | "Direction1D" | "Direction2D" | "Direction3D" | "ViewportPosition";

interface ActionConfig<T extends ActionType = ActionType> {
	readonly description?: string;
	readonly enabled?: boolean;
	readonly modifiers?: ReadonlyArray<Modifier>;
	readonly triggers?: ReadonlyArray<TypedTrigger>;
	readonly type: T;
}
```

### Notes

- `type` maps directly to Roblox `InputAction.Type`
- `enabled` is per-action default authoring config
- wrappers like `bool()` and `direction2d()` are sugar only
- `ActionConfig` is generic over `T extends ActionType` so literal types propagate

## Convenience Wrappers

Each wrapper fixes the `type` literal in its return type:

```ts
function action<T extends ActionType>(config: ActionConfig<T>): ActionConfig<T>;

function bool(config?: Omit<ActionConfig, "type">): ActionConfig<"Bool">;
function direction1d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction1D">;
function direction2d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction2D">;
function direction3d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction3D">;
function position2d(config?: Omit<ActionConfig, "type">): ActionConfig<"ViewportPosition">;
```

## Type Extractors

Mapped types extract action names by their `type`, mirroring the approach in
`flux/types.ts`:

```ts
type ActionMap = Record<string, ActionConfig>;

type BoolActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Bool"> ? K : never;
}[keyof T];

type Direction1dActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Direction1D"> ? K : never;
}[keyof T];

type Direction2DActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Direction2D"> ? K : never;
}[keyof T];

type Direction3dActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Direction3D"> ? K : never;
}[keyof T];

type ViewportPositionActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"ViewportPosition"> ? K : never;
}[keyof T];

type AxisActions<T extends ActionMap> =
	| Direction1dActions<T>
	| Direction2DActions<T>
	| Direction3dActions<T>;

type AllActions<T extends ActionMap> = keyof T & string;
```

## `defineActions`

Preserves literal keys and action types via generics:

```ts
function defineActions<T extends Record<string, ActionConfig>>(actions: T): T;
```

## Context Definition

Use `bindings` inside contexts. Binding keys are validated against action names
at `createCore` time, not at `defineContexts`.

```ts
const contexts = defineContexts({
	gameplay: {
		bindings: {
			aim: [Enum.UserInputType.MouseMovement, Enum.UserInputType.Touch],
			heavyAttack: [Enum.KeyCode.F, Enum.KeyCode.ButtonR2],
			jump: [Enum.KeyCode.Space, Enum.KeyCode.ButtonA],
			move: [WASD, Enum.KeyCode.Thumbstick1],
		},
		priority: 0,
	},

	ui: {
		bindings: {
			cancel: [Enum.KeyCode.Escape, Enum.KeyCode.ButtonB],
			confirm: [Enum.KeyCode.Return, Enum.KeyCode.ButtonA],
			navigate: [ARROWS, Enum.KeyCode.Thumbstick1],
		},
		priority: 10,
		sink: true,
	},
});
```

## Context Config Shape

```ts
interface ContextConfig {
	readonly bindings: Record<string, ReadonlyArray<BindingLike>>;
	readonly priority: number;
	readonly sink?: boolean;
}
```

### Extra Notes

- `bindings` keys are validated against action names at `createCore` — typos are compile errors
- `bindings` maps action names to one or more `InputBinding`-like definitions
- `sink` is Flux behavior for blocking lower-priority contexts
- `priority` controls conflict resolution between active contexts

## `defineContexts`

Identity function that preserves literal keys. No action validation here —
cross-validation of binding keys against action names happens at `createCore`.

```ts
function defineContexts<T extends Record<string, ContextConfig>>(contexts: T): T;
```

## Core Creation

```ts
const flux = createCore({
	actions,
	contexts,
	replication: {
		onDiffs: (handle, diffs) => {
			// send to server
		},
		transport: "remote",
	},
});
```

Namespace form should also work:

```ts
const flux = Flux.createCore({ actions, contexts });
```

## Core Config Shape

`createCore` cross-validates binding keys in `TContexts` against `TActions`.
Binding keys that don't match an action name are compile errors.

```ts
type ValidateContextBindings<
	TActions extends ActionMap,
	TContexts extends Record<string, ContextConfig>,
> = {
	readonly [K in keyof TContexts]: {
		readonly bindings: Partial<Record<AllActions<TActions>, ReadonlyArray<BindingLike>>>;
		readonly priority: TContexts[K]["priority"];
		readonly sink?: TContexts[K]["sink"];
	};
};

interface CoreConfig<
	TActions extends ActionMap = ActionMap,
	TContexts extends Record<string, ContextConfig> = Record<string, ContextConfig>,
> {
	readonly actions: TActions;
	readonly contexts: TContexts & ValidateContextBindings<TActions, TContexts>;
	readonly replication?: {
		readonly flush?: "auto" | "manual";
		readonly onDiffs?: (handle: InputHandle, diffs: ReadonlyArray<ActionDiff>) => void;
		readonly transport?: "native" | "remote";
	};
}
```

### Replication Notes

- `transport` controls how diffs move: `"remote"` sends via RemoteEvents,
  `"native"` is reserved for future server-authoritative games
- `flush` controls when diffs are sent: `"auto"` (default) flushes in
  `update()`, `"manual"` requires calling `flushDiffs()` yourself
- Only `remote` transport is implemented initially; `native` is reserved for
  future use

## Core Runtime API

```ts
interface FluxCore<TActions extends ActionMap = ActionMap> {
	addContext(handle: InputHandle, context: string): void;
	applyDiff(handle: InputHandle, diff: ActionDiff): void;

	destroy(): void;
	flushDiffs(handle: InputHandle): ReadonlyArray<ActionDiff>;
	getContexts(handle: InputHandle): ReadonlyArray<string>;

	getState(handle: InputHandle): ActionState<TActions>;
	hasContext(handle: InputHandle, context: string): boolean;

	loadBindings(handle: InputHandle, data: BindingState<TActions>): void;
	query(...contexts: ReadonlyArray<string>): Iterable<[InputHandle, ActionState<TActions>]>;
	rebind(
		handle: InputHandle,
		action: AllActions<TActions>,
		bindings: ReadonlyArray<BindingLike>,
	): void;

	rebindAll(handle: InputHandle, bindings: BindingState<TActions>): void;
	register(...contexts: ReadonlyArray<string>): InputHandle;
	removeContext(handle: InputHandle, context: string): void;

	resetAllBindings(handle: InputHandle): void;
	resetBindings(handle: InputHandle, action: AllActions<TActions>): void;
	serializeBindings(handle: InputHandle): BindingState<TActions>;
	simulateAction<A extends AllActions<TActions>>(
		handle: InputHandle,
		action: A,
		state: ActionValue<TActions, A>,
	): void;
	unregister(handle: InputHandle): void;

	update(deltaTime: number): void;
}
```

## Runtime Notes

- `register(...contexts)` is the simplest spawn/setup path
- `register()` returns an `InputHandle`, not a player/entity instance
- `update(deltaTime)` is the canonical per-frame entry point
- `query(...contexts)` is the core iteration API for registered owners
- `simulateAction()` is the only method for script-driven input injection
- `getContexts()` is runtime/controller state, not `ActionState`
- `rebind()` updates one action
- `rebindAll()` replaces an owner's full binding state in one save/apply step

## Binding State

```ts
type BindingState<TActions extends ActionMap = ActionMap> = Partial<
	Record<AllActions<TActions>, ReadonlyArray<BindingLike>>
>;
```

### Binding State Notes

- `BindingState` represents the full current binding set for one registered owner/handle
- `rebindAll()` is for settings flows where several edits are staged, then saved together
- `rebindAll()` should replace the current override state, not patch it incrementally
- `serializeBindings()` returns a `BindingState` object; `loadBindings()` accepts one
- Core exports/imports typed `BindingState` objects — the user handles JSON encode/decode for persistence

### Settings Example

```ts
const pendingBindings: BindingState<typeof actions> = {
	heavyAttack: [Enum.KeyCode.F, Enum.KeyCode.ButtonR2],
	jump: [Enum.KeyCode.Space, Enum.KeyCode.ButtonA],
	move: [WASD, Enum.KeyCode.Thumbstick1],
};

function saveBindings(handle: InputHandle): void {
	flux.rebindAll(handle, pendingBindings);
	const bindingState = flux.serializeBindings(handle);
	// user handles JSON encode/decode for persistence
	const json = game.GetService("HttpService").JSONEncode(bindingState);
	// persist json string to DataStore / profile
}

function restoreBindings(handle: InputHandle, json: string): void {
	const bindingState = game.GetService("HttpService").JSONDecode(json) as BindingState<
		typeof actions
	>;
	flux.loadBindings(handle, bindingState);
}
```

## ActionState API

`ActionState` should answer input questions only. Methods are constrained to
accept only action names whose `type` matches.

```ts
type ActionValue<TActions extends ActionMap, A extends AllActions<TActions>> =
	A extends BoolActions<TActions>
		? boolean
		: A extends Direction1dActions<TActions>
			? number
			: A extends Direction2DActions<TActions>
				? Vector2
				: A extends Direction3dActions<TActions>
					? Vector3
					: A extends ViewportPositionActions<TActions>
						? Vector2
						: unknown;

interface ActionState<TActions extends ActionMap = ActionMap> {
	// Axis-typed methods
	axis1d(action: Direction1dActions<TActions>): number;
	axis3d(action: Direction3dActions<TActions>): Vector3;
	axisBecameActive(action: AxisActions<TActions>): boolean;

	axisBecameInactive(action: AxisActions<TActions>): boolean;
	// Any-action methods
	canceled(action: AllActions<TActions>): boolean;
	claim(action: AllActions<TActions>): boolean;
	currentDuration(action: AllActions<TActions>): number;
	direction2d(action: Direction2DActions<TActions>): Vector2;
	getState<A extends AllActions<TActions>>(action: A): ActionValue<TActions, A>;

	isAvailable(action: AllActions<TActions>): boolean;
	isClaimed(action: AllActions<TActions>): boolean;
	isEnabled(action: AllActions<TActions>): boolean;
	// Bool-only methods
	justPressed(action: BoolActions<TActions>): boolean;
	justReleased(action: BoolActions<TActions>): boolean;
	ongoing(action: AllActions<TActions>): boolean;
	position2d(action: ViewportPositionActions<TActions>): Vector2;
	pressed(action: BoolActions<TActions>): boolean;
	previousDuration(action: AllActions<TActions>): number;
	triggered(action: AllActions<TActions>): boolean;
}
```

## ActionState Notes

- `getState()` is the canonical generic accessor for any action's current value
- keep button helpers like `pressed()` and `justPressed()` for ergonomics
- keep trigger helpers because they are central Flux value-add
- do not put context ownership queries on `ActionState`

## `createCore`

Infers `TActions` from config, cross-validates context binding keys against
action names, and returns a typed `FluxCore`:

```ts
function createCore<TActions extends ActionMap, TContexts extends Record<string, ContextConfig>>(
	config: CoreConfig<TActions, TContexts>,
): FluxCore<TActions>;
```

## Type Safety

The generic approach ensures compile-time correctness at every layer:

- **Action names** — `defineActions` preserves literal keys; typos in context
  bindings, `rebind()`, or `simulateAction()` calls are caught at compile time
- **Action type constraints** — `pressed("move")` is a type error when `move`
  is `Direction2D`; `axis1d("jump")` is a type error when `jump` is `Bool`
- **Return types** — `getState()` returns the correct value type
  (`boolean`, `number`, `Vector2`, `Vector3`) based on the action's `type`
- **Context bindings** — `createCore` cross-validates binding keys against
  `keyof TActions`, catching misspelled or missing action names at compile time

This mirrors the existing mapped-type approach in `flux/types.ts`
(`ButtonActions<T>`, `Axis1dActions<T>`, etc.) adapted to the new Roblox-aligned
action type names.

## Modifiers

Modifiers are core-supported value transforms.

```ts
interface ModifierContext {
	readonly deltaTime: number;
	readonly handle: InputHandle;
}

interface Modifier {
	modify(value: number, context: ModifierContext): number;
	modify(value: Vector2, context: ModifierContext): Vector2;
	modify(value: Vector3, context: ModifierContext): Vector3;
}
```

Example helpers:

```ts
deadZone(threshold);
negate();
scale(factor);
```

## Triggers

Triggers are core-supported state gates layered on top of raw action state.

```ts
type TriggerState = "canceled" | "none" | "ongoing" | "triggered";

interface Trigger {
	reset(): void;
	update(magnitude: number, duration: number, deltaTime: number): TriggerState;
}

type TriggerType = "blocker" | "explicit" | "implicit";

interface TypedTrigger {
	readonly trigger: Trigger;
	readonly type: TriggerType;
}
```

### Magnitude Approach

Triggers receive a `magnitude` instead of a boolean `pressed` flag:

- **Bool actions** pass `0` or `1`
- **Axis actions** pass the vector length (e.g. `Vector2.Magnitude`)
- Triggers gate whether the action fires — they do not modify the value
- This follows Unreal Engine's Enhanced Input approach

Example helpers:

```ts
implicit(trigger);
explicit(trigger);
blocker(trigger);

hold({ attempting, oneShot, threshold });
tap({ threshold });
doubleTap({ window });
```

### Trigger Implementation Sketches

Based on existing prototypes, updated to use `magnitude: number` instead of
`pressed: boolean`.

#### `hold`

```ts
interface HoldOptions {
	/** Minimum duration before "ongoing" state begins. */
	readonly attempting: number;
	/** If true, only triggers once until released. */
	readonly oneShot?: boolean;
	/** Duration required to trigger. */
	readonly threshold: number;
}

// Hold trigger — fires after holding input for threshold duration.
function hold({ attempting, oneShot, threshold }: HoldOptions): Trigger {
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

#### `tap`

```ts
interface TapOptions {
	/** Maximum duration to count as a tap. */
	readonly threshold: number;
}

// Tap trigger — fires on release if held less than threshold.
function tap({ threshold }: TapOptions): Trigger {
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

#### `doubleTap`

```ts
interface DoubleTapOptions {
	/** Maximum time between taps. */
	readonly window: number;
}

// Double tap trigger — fires on second tap within window.
function doubleTap({ window }: DoubleTapOptions): Trigger {
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
				if (now - lastTapTime < window) {
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

## Binding Helpers

Binding presets are optional ergonomics, not required API.

```ts
const WASD = {
	down: Enum.KeyCode.S,
	left: Enum.KeyCode.A,
	right: Enum.KeyCode.D,
	up: Enum.KeyCode.W,
};

const AD = {
	negative: Enum.KeyCode.A,
	positive: Enum.KeyCode.D,
};
```

## Example

```ts
import {
	action,
	createCore,
	deadZone,
	defineActions,
	defineContexts,
	hold,
	implicit,
} from "@rbxts/flux";

const actions = defineActions({
	aim: action({ type: "ViewportPosition" }),
	heavyAttack: action({
		triggers: [implicit(hold({ attempting: 0.2, oneShot: true, threshold: 0.5 }))],
		type: "Bool",
	}),
	jump: action({ type: "Bool" }),
	move: action({ modifiers: [deadZone(0.1)], type: "Direction2D" }),
});

const contexts = defineContexts({
	gameplay: {
		bindings: {
			aim: [Enum.UserInputType.MouseMovement, Enum.UserInputType.Touch],
			heavyAttack: [Enum.KeyCode.F, Enum.KeyCode.ButtonR2],
			jump: [Enum.KeyCode.Space, Enum.KeyCode.ButtonA],
			move: [WASD, Enum.KeyCode.Thumbstick1],
		},
		priority: 0,
	},
});

const core = createCore({
	actions,
	contexts,
	replication: {
		onDiffs: (handle, diffs) => {
			// remote event
		},
		transport: "remote",
	},
});

// core is FluxCore<typeof actions>
// All action names and types are inferred.

interface Context {
	flux: typeof core;
}

function update({ flux }: Context, deltaTime: number): void {
	flux.update(deltaTime);

	for (const [inputHandle, state] of flux.query("gameplay")) {
		// state is ActionState<typeof actions>

		if (state.justPressed("jump")) {
			// ✓ "jump" is Bool
			print("Jump", inputHandle);
		}

		// state.justPressed("move");           // ✗ compile error — "move" is Direction2D

		if (state.triggered("heavyAttack")) {
			// ✓ triggered() accepts any action
			print("Heavy Attack", inputHandle);
		}

		const move = state.direction2d("move"); // ✓ returns Vector2
		const aim = state.position2d("aim"); // ✓ returns Vector2

		// state.direction2d("jump");            // ✗ compile error — "jump" is Bool

		print(move, aim);
	}
}
```

## Final Recommendation

- canonical action authoring: `action({ type })`
- optional sugar: `bool()`, `direction2d()`, `position2d()`
- canonical context field: `bindings`
- canonical runtime entry point: `update(deltaTime)`
- canonical script-driven input verb: `simulateAction()`
- `Flux` namespace available, never required
- named exports remain first-class
