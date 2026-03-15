# Phase 1: Foundation -- Setup + Action/Context Definition

## Project Overview

Flux is an Input Action System wrapper for Roblox built with roblox-ts. It wraps
Roblox's `InputAction`, `InputBinding`, and `InputContext` APIs with a
declarative authoring layer. The core package (`@rbxts/flux`) is ECS-agnostic.
This is a roblox-ts project -- no default exports, uses Roblox globals
(`Vector2`, `Vector3`, `Enum`, etc.).

## Commands

```bash
pnpm typecheck          # type check all packages
pnpm build              # transpile TypeScript to Luau
pnpm test               # build + run jest-roblox tests
```

## Testing

Tests use jest-roblox. Import from `@rbxts/jest-globals`:

```ts
import { describe, expect, it } from "@rbxts/jest-globals";
```

Test files are `.spec.ts`, co-located with source files. **Write tests before
implementation (TDD).**

---

## Task 1.1: Project Setup

Clean up scaffolding so the core package is ready for real code.

### Task 1.1 Changes

**`packages/core/tsconfig.lib.json`** -- change include from `"src/*"` to
`"src/**/*"` so nested directories compile:

```json
{
	"include": ["src/**/*", "../../types/**/*.d.ts"]
}
```

**`packages/core/package.json`** -- remove `peerDependencies` block (has
`@rbxts/jecs` which core doesn't need -- JECS is a separate wrapper package).

**`packages/core/src/index.ts`** -- remove placeholder `makeHello`. Leave empty.

**`packages/core/src/index.spec.ts`** -- remove placeholder test. Delete file.

### Task 1.1 Acceptance Criteria

- [ ] `tsconfig.lib.json` include is `"src/**/*"`
- [ ] `package.json` has no `peerDependencies`
- [ ] `src/index.ts` has no `makeHello` function
- [ ] `pnpm typecheck` passes

---

## Task 1.2: Action Types + defineActions

Define only the types needed for action definition, then implement
`defineActions` and the convenience wrappers. **Tests first.**

### Task 1.2 Dependencies

- Task 1.1 complete

### Task 1.2 Types to Create

Only create types this task actually needs. Types for `InputHandle`,
`ActionState`, `FluxCore`, `CoreConfig`, etc. are deferred to the phases that
implement them.

**`packages/core/src/types/actions.ts`**

```ts
// Roblox-aligned action types mapping to InputAction.Type.
export type ActionType =
	| "Bool"
	| "Direction1D"
	| "Direction2D"
	| "Direction3D"
	| "ViewportPosition";

// Configuration for a single input action.
export interface ActionConfig<T extends ActionType = ActionType> {
	readonly description?: string;
	readonly enabled?: boolean;
	readonly modifiers?: ReadonlyArray<Modifier>;
	readonly triggers?: ReadonlyArray<TypedTrigger>;
	readonly type: T;
}

// A record mapping action names to their configurations.
export type ActionMap = Record<string, ActionConfig>;

// -- Type extractors: filter action names by their ActionType --

export type BoolActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Bool"> ? K : never;
}[keyof T];

export type Direction1dActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Direction1D"> ? K : never;
}[keyof T];

export type Direction2dActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Direction2D"> ? K : never;
}[keyof T];

export type Direction3dActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Direction3D"> ? K : never;
}[keyof T];

export type ViewportPositionActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"ViewportPosition"> ? K : never;
}[keyof T];

export type AxisActions<T extends ActionMap> =
	| Direction1dActions<T>
	| Direction2dActions<T>
	| Direction3dActions<T>;

export type AllActions<T extends ActionMap> = keyof T & string;
```

This file imports `Modifier` and `TypedTrigger`. Create minimal stubs so
typechecking passes:

**`packages/core/src/modifiers/types.ts`** (stub):

```ts
export interface ModifierContext {
	readonly deltaTime: number;
}

// Stub -- full implementation in Phase 2.
export interface Modifier {
	modify(value: number, context: ModifierContext): number;
	modify(value: Vector2, context: ModifierContext): Vector2;
	modify(value: Vector3, context: ModifierContext): Vector3;
}
```

**`packages/core/src/triggers/types.ts`** (stub):

```ts
// Stub -- full implementation in Phase 2.
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

### Task 1.2 Tests (write first)

**`packages/core/src/actions/define.spec.ts`**

```ts
import { describe, expect, it } from "@rbxts/jest-globals";

import {
	action,
	bool,
	defineActions,
	direction1d,
	direction2d,
	direction3d,
	position2d,
} from "./define";

describe("defineActions", () => {
	it("should return the same actions object", () => {
		const actions = defineActions({
			jump: action({ type: "Bool" }),
			move: action({ type: "Direction2D" }),
		});

		expect(actions.jump.type).toBe("Bool");
		expect(actions.move.type).toBe("Direction2D");
	});

	it("should work with convenience wrappers", () => {
		const actions = defineActions({
			aim: position2d(),
			jump: bool(),
			move: direction2d(),
		});

		expect(actions.jump.type).toBe("Bool");
		expect(actions.move.type).toBe("Direction2D");
		expect(actions.aim.type).toBe("ViewportPosition");
	});
});

describe("action", () => {
	it("should preserve the type literal", () => {
		const cfg = action({ type: "Bool" });
		expect(cfg.type).toBe("Bool");
	});

	it("should accept optional fields", () => {
		const cfg = action({
			description: "Jump action",
			enabled: false,
			type: "Bool",
		});

		expect(cfg.description).toBe("Jump action");
		expect(cfg.enabled).toBe(false);
	});
});

describe("convenience wrappers", () => {
	it("bool should create Bool config", () => {
		expect(bool().type).toBe("Bool");
		expect(bool({ description: "Fire" }).description).toBe("Fire");
	});

	it("direction1d should create Direction1D config", () => {
		expect(direction1d().type).toBe("Direction1D");
	});

	it("direction2d should create Direction2D config", () => {
		expect(direction2d().type).toBe("Direction2D");
	});

	it("direction3d should create Direction3D config", () => {
		expect(direction3d().type).toBe("Direction3D");
	});

	it("position2d should create ViewportPosition config", () => {
		expect(position2d().type).toBe("ViewportPosition");
	});
});
```

### Task 1.2 Implementation (write after tests)

**`packages/core/src/actions/define.ts`**

```ts
import type { ActionConfig, ActionType } from "../types/actions";

export function defineActions<T extends Record<string, ActionConfig>>(actions: T): T {
	return actions;
}

export function action<T extends ActionType>(config: ActionConfig<T>): ActionConfig<T> {
	return config;
}

export function bool(config?: Omit<ActionConfig, "type">): ActionConfig<"Bool"> {
	return { ...config, type: "Bool" };
}

export function direction1d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction1D"> {
	return { ...config, type: "Direction1D" };
}

export function direction2d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction2D"> {
	return { ...config, type: "Direction2D" };
}

export function direction3d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction3D"> {
	return { ...config, type: "Direction3D" };
}

export function position2d(config?: Omit<ActionConfig, "type">): ActionConfig<"ViewportPosition"> {
	return { ...config, type: "ViewportPosition" };
}
```

### Task 1.2 Acceptance Criteria

- [ ] Types file exists at `src/types/actions.ts` with all type extractors
- [ ] Stubs exist at `src/modifiers/types.ts` and `src/triggers/types.ts`
- [ ] Tests written and failing (red)
- [ ] Implementation makes tests pass (green)
- [ ] `defineActions` preserves literal keys and type literals
- [ ] All convenience wrappers set the correct `type`
- [ ] `pnpm typecheck` passes

### Task 1.2 Verification

```bash
pnpm typecheck
pnpm test
```

---

## Task 1.3: Context Definition

Define `ContextConfig` and implement `defineContexts`. **Tests first.**

### Task 1.3 Dependencies

- Task 1.2 complete (ActionConfig types exist)

### Task 1.3 Types to Create

**`packages/core/src/types/bindings.ts`** -- only `BindingLike` is needed here.
`BindingState` is deferred to Phase 3/4 when rebinding is implemented.

```ts
// A binding-like value: KeyCode, UserInputType, or directional preset object.
export type BindingLike = Enum.KeyCode | Enum.UserInputType | Record<string, Enum.KeyCode>;
```

**`packages/core/src/types/contexts.ts`** -- context config lives here, not in
a monolithic `core.ts`.

```ts
import type { BindingLike } from "./bindings";

// Context configuration. Defines bindings, priority, and sink behavior.
export interface ContextConfig {
	readonly bindings: Record<string, ReadonlyArray<BindingLike>>;
	readonly priority: number;
	readonly sink?: boolean;
}
```

### Task 1.3 Tests (write first)

**`packages/core/src/contexts/define.spec.ts`**

```ts
import { describe, expect, it } from "@rbxts/jest-globals";

import { defineContexts } from "./define";

// eslint-disable-next-line max-lines-per-function -- Test file
describe("defineContexts", () => {
	it("should return the same contexts object", () => {
		const contexts = defineContexts({
			gameplay: {
				bindings: {
					jump: [Enum.KeyCode.Space],
				},
				priority: 0,
			},
		});

		expect(contexts.gameplay.priority).toBe(0);
		expect(contexts.gameplay.bindings.jump).toBeDefined();
	});

	it("should preserve sink property", () => {
		const contexts = defineContexts({
			ui: {
				bindings: {},
				priority: 10,
				sink: true,
			},
		});

		expect(contexts.ui.sink).toBe(true);
		expect(contexts.ui.priority).toBe(10);
	});

	it("should support multiple contexts", () => {
		const contexts = defineContexts({
			driving: { bindings: {}, priority: 5 },
			gameplay: { bindings: {}, priority: 0 },
			ui: { bindings: {}, priority: 10, sink: true },
		});

		expect(contexts.gameplay.priority).toBe(0);
		expect(contexts.driving.priority).toBe(5);
		expect(contexts.ui.priority).toBe(10);
	});
});
```

### Task 1.3 Implementation (write after tests)

**`packages/core/src/contexts/define.ts`**

```ts
import type { ContextConfig } from "../types/contexts";

// Identity function that preserves literal context names.
// No action validation here -- cross-validation happens at createCore.
export function defineContexts<T extends Record<string, ContextConfig>>(contexts: T): T {
	return contexts;
}

export type { ContextConfig } from "../types/contexts";
```

### Task 1.3 Acceptance Criteria

- [ ] `ContextConfig` type exists in `src/types/contexts.ts`
- [ ] `BindingLike` type exists in `src/types/bindings.ts`
- [ ] Tests written and failing (red)
- [ ] Implementation makes tests pass (green)
- [ ] `defineContexts` returns input unchanged
- [ ] `pnpm typecheck` passes

### Task 1.3 Verification

```bash
pnpm typecheck
pnpm test
```

---

## Task 1.4: Index Re-exports

Wire up the package entry point with everything created so far.

### Task 1.4 Dependencies

- Tasks 1.2 and 1.3 complete

### Task 1.4 Implementation

**`packages/core/src/index.ts`**

```ts
// Runtime
export {
	action,
	bool,
	defineActions,
	direction1d,
	direction2d,
	direction3d,
	position2d,
} from "./actions/define";
export { defineContexts } from "./contexts/define";

// Types
export type {
	ActionConfig,
	ActionMap,
	ActionType,
	AllActions,
	AxisActions,
	BoolActions,
	Direction1dActions,
	Direction2dActions,
	Direction3dActions,
	ViewportPositionActions,
} from "./types/actions";
export type { BindingLike } from "./types/bindings";
export type { ContextConfig } from "./types/contexts";
```

### Task 1.4 Acceptance Criteria

- [ ] All runtime functions are re-exported
- [ ] All public types are re-exported
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds

### Task 1.4 Verification

```bash
pnpm typecheck
pnpm build
```

---

## Phase 1 Checkpoint

- [ ] `tsconfig.lib.json` includes `src/**/*`
- [ ] `package.json` has no `peerDependencies`
- [ ] Types exist: `actions.ts`, `bindings.ts`, `contexts.ts` (only what's
      needed -- no `FluxCore`, `ActionState`, `InputHandle` yet)
- [ ] Stubs exist: `modifiers/types.ts`, `triggers/types.ts`
- [ ] `defineActions` + all convenience wrappers tested and passing
- [ ] `defineContexts` tested and passing
- [ ] `index.ts` re-exports all public API
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes

### What's deferred to later phases

These types are NOT created in Phase 1 -- they'll be defined alongside their
implementations:

- `InputHandle` -- Phase 3 (with `createCore`)
- `ActionState`, `ActionValue` -- Phase 3 (with ActionState implementation)
- `FluxCore`, `CoreConfig`, `ValidateContextBindings` -- Phase 3 (with `createCore`)
- `BindingState` -- Phase 4 (with rebinding)
- `ActionDiff` -- Phase 4 (with replication)
