import { describe, expect, it } from "@rbxts/jest-globals";
import { fromAny } from "@rbxts/jest-utils";

import type { ActionMap } from "../types/actions";
import type { BindingLike } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { HandleData } from "./handle-lifecycle";
import type { PlatformOverrides } from "./platform-overrides";
import {
	freezeContextBindings,
	getContextBindings,
	resolveBindingOrigin,
	resolveBindings,
	resolveBindingsForPlatform,
} from "./resolve-bindings";

/** A touch binding needing no `GuiButton`, so the spec stays instance-free. */
const AIM_BINDING: BindingLike = { pointerIndex: 1 };

const Wasd = {
	down: Enum.KeyCode.S,
	left: Enum.KeyCode.A,
	right: Enum.KeyCode.D,
	up: Enum.KeyCode.W,
} as const;

const SPEC_ACTIONS = {
	aim: { type: "ViewportPosition" as const },
	jump: { type: "Bool" as const },
	move: { type: "Direction2D" as const },
} satisfies ActionMap;

type SpecActions = typeof SPEC_ACTIONS;

const SPEC_CONTEXTS = {
	gameplay: {
		bindings: {
			aim: [AIM_BINDING],
			jump: [Enum.KeyCode.Space, Enum.KeyCode.ButtonA],
			move: [Wasd],
		},
		priority: 0,
	},
	/** Declares an action the core's action map does not know. */
	legacy: {
		bindings: {
			retired: [Enum.KeyCode.Q],
		},
		priority: 5,
	},
	ui: {
		bindings: {
			jump: [Enum.KeyCode.Return, Enum.KeyCode.Space],
		},
		priority: 10,
	},
} satisfies Record<string, ContextConfig>;

/**
 * Builds the slice of handle state a binding read touches.
 * @param activeContexts - Active context names, oldest activation first.
 * @param bindingOverrides - Per-action override buckets.
 * @returns Handle state carrying only what the read path reads.
 */
function handleWith(
	activeContexts: ReadonlyArray<string>,
	bindingOverrides: Map<string, PlatformOverrides>,
): HandleData<SpecActions> {
	return fromAny({ activeContexts, bindingOverrides });
}

/**
 * Wraps one action's override buckets in the map the handle holds.
 * @param action - The action the buckets belong to.
 * @param buckets - That action's per-platform buckets.
 * @returns The override map.
 */
function overridesFor(action: string, buckets: PlatformOverrides): Map<string, PlatformOverrides> {
	return new Map([[action, buckets]]);
}

describe("freezeContextBindings", () => {
	it("should freeze every binding array the config declares", () => {
		expect.assertions(1);

		const jumpBindings: ReadonlyArray<BindingLike> = [Enum.KeyCode.Space];
		const contexts: Record<string, ContextConfig> = {
			gameplay: { bindings: { jump: jumpBindings } },
		};

		freezeContextBindings(contexts);

		expect(table.isfrozen(jumpBindings)).toBeTrue();
	});

	it("should tolerate a config record already frozen by another core", () => {
		expect.assertions(1);

		const contexts: Record<string, ContextConfig> = {
			gameplay: { bindings: { jump: [Enum.KeyCode.Space] } },
		};
		freezeContextBindings(contexts);

		const freezeAgain = (): void => {
			freezeContextBindings(contexts);
		};

		expect(freezeAgain).never.toThrow();
	});
});

describe("getContextBindings", () => {
	it("should return the bindings a context declares for an action", () => {
		expect.assertions(1);

		const result = getContextBindings({
			action: "jump",
			context: "gameplay",
			contexts: SPEC_CONTEXTS,
		});

		expect(result).toStrictEqual([Enum.KeyCode.Space, Enum.KeyCode.ButtonA]);
	});

	it("should return an empty list for an action the context does not declare", () => {
		expect.assertions(1);

		const result = getContextBindings({
			action: "move",
			context: "ui",
			contexts: SPEC_CONTEXTS,
		});

		expect(result).toStrictEqual([]);
	});

	it("should throw for a context the config does not hold", () => {
		expect.assertions(1);

		const read = (): void => {
			getContextBindings({ action: "jump", context: "nope", contexts: SPEC_CONTEXTS });
		};

		expect(read).toThrow("missing context config: nope");
	});
});

describe("resolveBindings", () => {
	it("should return one context's declared bindings when nothing is overridden", () => {
		expect.assertions(1);

		const result = resolveBindings({
			action: "jump",
			context: "gameplay",
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay"], new Map()),
		});

		expect(result).toStrictEqual([Enum.KeyCode.Space, Enum.KeyCode.ButtonA]);
	});

	it("should merge every active context in first-seen order, deduped", () => {
		expect.assertions(1);

		const result = resolveBindings({
			action: "jump",
			context: undefined,
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay", "ui"], new Map()),
		});

		expect(result).toStrictEqual([
			Enum.KeyCode.Space,
			Enum.KeyCode.ButtonA,
			Enum.KeyCode.Return,
		]);
	});

	it("should compose an override over the platforms it leaves alone", () => {
		expect.assertions(1);

		const overrides = overridesFor("jump", new Map([["gamepad", [Enum.KeyCode.ButtonY]]]));

		const result = resolveBindings({
			action: "jump",
			context: "gameplay",
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay"], overrides),
		});

		expect(result).toStrictEqual([Enum.KeyCode.Space, Enum.KeyCode.ButtonY]);
	});

	it("should return an empty list for an action no active context declares", () => {
		expect.assertions(1);

		const result = resolveBindings({
			action: "aim",
			context: undefined,
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["ui"], new Map()),
		});

		expect(result).toStrictEqual([]);
	});
});

describe("resolveBindingsForPlatform", () => {
	it("should filter the declared bindings by classification with no override", () => {
		expect.assertions(1);

		const result = resolveBindingsForPlatform({
			action: "jump",
			context: "gameplay",
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay"], new Map()),
			platform: "gamepad",
		});

		expect(result).toStrictEqual([Enum.KeyCode.ButtonA]);
	});

	it("should keep a binding on the row the player stored it on", () => {
		expect.assertions(1);

		const overrides = overridesFor("jump", new Map([["keyboard", [Enum.KeyCode.ButtonY]]]));

		const result = resolveBindingsForPlatform({
			action: "jump",
			context: "gameplay",
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay"], overrides),
			platform: "keyboard",
		});

		expect(result).toStrictEqual([Enum.KeyCode.ButtonY]);
	});

	it("should return an empty list for a deliberately unbound platform", () => {
		expect.assertions(1);

		const overrides = overridesFor("jump", new Map([["gamepad", []]]));

		const result = resolveBindingsForPlatform({
			action: "jump",
			context: "gameplay",
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay"], overrides),
			platform: "gamepad",
		});

		expect(result).toStrictEqual([]);
	});
});

describe("resolveBindingOrigin", () => {
	it("should report a declared action with no override as a default", () => {
		expect.assertions(1);

		const result = resolveBindingOrigin({
			action: "jump",
			actions: SPEC_ACTIONS,
			context: "gameplay",
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay"], new Map()),
			platform: "keyboard",
		});

		expect(result).toBe("default");
	});

	it("should report a platform holding a bucket as an override", () => {
		expect.assertions(1);

		const overrides = overridesFor("jump", new Map([["gamepad", [Enum.KeyCode.ButtonY]]]));

		const result = resolveBindingOrigin({
			action: "jump",
			actions: SPEC_ACTIONS,
			context: "gameplay",
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay"], overrides),
			platform: "gamepad",
		});

		expect(result).toBe("override");
	});

	it("should report a deliberate unbind as an override, not a default", () => {
		expect.assertions(1);

		const overrides = overridesFor("jump", new Map([["gamepad", []]]));

		const result = resolveBindingOrigin({
			action: "jump",
			actions: SPEC_ACTIONS,
			context: "gameplay",
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay"], overrides),
			platform: "gamepad",
		});

		expect(result).toBe("override");
	});

	it("should leave an untouched platform reporting a default", () => {
		expect.assertions(1);

		const overrides = overridesFor("jump", new Map([["gamepad", [Enum.KeyCode.ButtonY]]]));

		const result = resolveBindingOrigin({
			action: "jump",
			actions: SPEC_ACTIONS,
			context: "gameplay",
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay"], overrides),
			platform: "keyboard",
		});

		expect(result).toBe("default");
	});

	it("should let a named context outrank an override it never declared", () => {
		expect.assertions(1);

		const overrides = overridesFor("move", new Map([["keyboard", [Enum.KeyCode.F]]]));

		const result = resolveBindingOrigin({
			action: "move",
			actions: SPEC_ACTIONS,
			context: "ui",
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay", "ui"], overrides),
			platform: "keyboard",
		});

		expect(result).toBe("undeclared");
	});

	it("should drop that gate when no context is named", () => {
		expect.assertions(1);

		const overrides = overridesFor("move", new Map([["keyboard", [Enum.KeyCode.F]]]));

		const result = resolveBindingOrigin({
			action: "move",
			actions: SPEC_ACTIONS,
			context: undefined,
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["gameplay", "ui"], overrides),
			platform: "keyboard",
		});

		expect(result).toBe("override");
	});

	it("should report undeclared when no active context declares the action", () => {
		expect.assertions(1);

		const result = resolveBindingOrigin({
			action: "aim",
			actions: SPEC_ACTIONS,
			context: undefined,
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["ui"], new Map()),
			platform: "touch",
		});

		expect(result).toBe("undeclared");
	});

	it("should report undeclared for a binding the action map no longer knows", () => {
		expect.assertions(1);

		const result = resolveBindingOrigin({
			action: "retired",
			actions: SPEC_ACTIONS,
			context: "legacy",
			contexts: SPEC_CONTEXTS,
			handleData: handleWith(["legacy"], new Map()),
			platform: "keyboard",
		});

		expect(result).toBe("undeclared");
	});
});
