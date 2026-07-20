import { describe, expect, it, jest } from "@rbxts/jest-globals";
import { afterThis, fromAny } from "@rbxts/jest-utils";

import type { InputPlatform } from "../bindings/classify";
import type { ActionMap } from "../types/actions";
import type { BindingLike, BindingState } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import { createCore } from "./create-core";

const REBIND_ACTIONS = {
	jump: { type: "Bool" as const },
	move: { type: "Direction2D" as const },
} satisfies ActionMap;

const REBIND_CONTEXTS = {
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.Space],
			move: [
				{
					down: Enum.KeyCode.S,
					left: Enum.KeyCode.A,
					right: Enum.KeyCode.D,
					up: Enum.KeyCode.W,
				},
			],
		},
		priority: 0,
	},
	ui: {
		bindings: {
			jump: [Enum.KeyCode.Return],
		},
		priority: 10,
	},
} satisfies Record<string, ContextConfig>;

function getKeyCodes(
	parent: Instance,
	contextName: string,
	actionName: string,
): Array<Enum.KeyCode> {
	const folder = parent.FindFirstChild("input");
	assert(folder, "input folder missing");
	const context = folder.FindFirstChild(contextName);
	assert(context, `context missing: ${contextName}`);
	const action = context.FindFirstChild(actionName);
	assert(action, `action missing: ${actionName}`);
	const keyCodes = new Array<Enum.KeyCode>();
	for (const child of action.GetChildren()) {
		if (classIs(child, "InputBinding")) {
			keyCodes.push(child.KeyCode);
		}
	}

	return keyCodes;
}

function getPlatformBucket(
	state: BindingState<typeof REBIND_ACTIONS>,
	action: keyof typeof REBIND_ACTIONS,
	platform: InputPlatform,
): ReadonlyArray<BindingLike> | undefined {
	const entry = state[action];
	return entry === undefined ? undefined : entry[platform];
}

describe("rebind", () => {
	it("should update bindings for a single action", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebind(handle, "jump", [Enum.KeyCode.F]);

		const keys = getKeyCodes(parent, "gameplay", "jump");

		expect(keys).toHaveLength(1);
		expect(keys).toContain(Enum.KeyCode.F);
	});

	it("should not affect other actions", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebind(handle, "jump", [Enum.KeyCode.F]);

		expect(getKeyCodes(parent, "gameplay", "move")).toHaveLength(1);
	});

	it("should apply across every context where the action exists", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay", "ui");
		core.rebind(handle, "jump", [Enum.KeyCode.F]);

		expect(getKeyCodes(parent, "gameplay", "jump")).toContain(Enum.KeyCode.F);
		expect(getKeyCodes(parent, "ui", "jump")).toContain(Enum.KeyCode.F);
	});

	it("should throw for subscribed handles", () => {
		expect.assertions(1);

		const serverParent = new Instance("Folder");
		const serverCore = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		serverCore.register(serverParent, "gameplay");

		const clientCore = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const [clientHandle] = clientCore.subscribe(serverParent, "gameplay");

		const rebind = (): void => {
			clientCore.rebind(clientHandle, "jump", [Enum.KeyCode.F]);
		};

		expect(rebind).toThrow("subscribed handle");
	});

	it("should apply to contexts activated after the rebind", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebind(handle, "jump", [Enum.KeyCode.F]);
		core.addContext(handle, "ui");

		expect(getKeyCodes(parent, "ui", "jump")).toContain(Enum.KeyCode.F);
	});

	it("should skip replay for actions absent from the newly added context", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebind(handle, "move", [
			{
				down: Enum.KeyCode.K,
				left: Enum.KeyCode.J,
				right: Enum.KeyCode.L,
				up: Enum.KeyCode.I,
			},
		]);

		const addContext = (): void => {
			core.addContext(handle, "ui");
		};

		expect(addContext).never.toThrow();
	});
});

describe("rebind validation", () => {
	it("should leave existing bindings intact when a rebind is rejected", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");

		const rebind = (): void => {
			core.rebind(handle, "jump", [{ pressedThreshold: 0.5 }]);
		};

		expect(rebind).toThrow("no input source");
		expect(getKeyCodes(parent, "gameplay", "jump")).toStrictEqual([Enum.KeyCode.Space]);
	});

	it("should record no override when a rebind is rejected", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");

		const rebind = (): void => {
			core.rebind(handle, "jump", [{ pressedThreshold: 0.5 }]);
		};

		expect(rebind).toThrow("no input source");
		expect(core.serializeBindings(handle).jump).toBeUndefined();
	});

	it("should leave bindings intact when a per-platform rebind is rejected", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");

		const rebind = (): void => {
			core.rebindForPlatform(handle, "jump", "keyboard", [{ pressedThreshold: 0.5 }]);
		};

		expect(rebind).toThrow("no input source");
		expect(getKeyCodes(parent, "gameplay", "jump")).toStrictEqual([
			Enum.KeyCode.Space,
			Enum.KeyCode.ButtonA,
		]);
	});

	it("should apply no overrides when any action in a full rebind is rejected", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebind(handle, "jump", [Enum.KeyCode.F]);

		const rebindAll = (): void => {
			core.rebindAll(handle, {
				jump: { keyboard: [Enum.KeyCode.G] },
				move: { keyboard: [{ scale: 2 }] },
			});
		};

		expect(rebindAll).toThrow("no input source");
		expect(getKeyCodes(parent, "gameplay", "jump")).toStrictEqual([Enum.KeyCode.F]);
	});
});

describe("rebindAll", () => {
	it("should replace all bindings", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindAll(handle, {
			jump: { keyboard: [Enum.KeyCode.F] },
			move: {
				keyboard: [
					{
						down: Enum.KeyCode.K,
						left: Enum.KeyCode.J,
						right: Enum.KeyCode.L,
						up: Enum.KeyCode.I,
					},
				],
			},
		});

		expect(getKeyCodes(parent, "gameplay", "jump")).toContain(Enum.KeyCode.F);
		expect(getKeyCodes(parent, "gameplay", "move")).toHaveLength(1);
	});

	it("should reset unspecified actions to defaults", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebind(handle, "jump", [Enum.KeyCode.F]);
		core.rebindAll(handle, {
			move: {
				keyboard: [
					{
						down: Enum.KeyCode.K,
						left: Enum.KeyCode.J,
						right: Enum.KeyCode.L,
						up: Enum.KeyCode.I,
					},
				],
			},
		});

		expect(getKeyCodes(parent, "gameplay", "jump")).toContain(Enum.KeyCode.Space);
	});
});

describe("resetBindings", () => {
	it("should restore original binding for one action", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebind(handle, "jump", [Enum.KeyCode.F]);
		core.resetBindings(handle, "jump");

		expect(getKeyCodes(parent, "gameplay", "jump")).toContain(Enum.KeyCode.Space);
	});
});

describe("resetAllBindings", () => {
	it("should restore all original bindings", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay", "ui");
		core.rebind(handle, "jump", [Enum.KeyCode.F]);
		core.resetAllBindings(handle);

		expect(getKeyCodes(parent, "gameplay", "jump")).toContain(Enum.KeyCode.Space);
		expect(getKeyCodes(parent, "ui", "jump")).toContain(Enum.KeyCode.Return);
	});
});

describe("serializeBindings", () => {
	it("should return only overridden actions", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebind(handle, "jump", [Enum.KeyCode.F]);
		const state = core.serializeBindings(handle);

		expect(getPlatformBucket(state, "jump", "keyboard")).toContain(Enum.KeyCode.F);
		expect(state.move).toBeUndefined();
	});

	it("should return an empty record when no overrides are set", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");

		const state = core.serializeBindings(handle);
		let count = 0;
		for (const [_key] of pairs(state)) {
			count += 1;
		}

		expect(count).toBe(0);
	});

	it("should throw for subscribed handles", () => {
		expect.assertions(1);

		const serverParent = new Instance("Folder");
		const serverCore = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		serverCore.register(serverParent, "gameplay");

		const clientCore = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const [clientHandle] = clientCore.subscribe(serverParent, "gameplay");

		const serialize = (): void => {
			clientCore.serializeBindings(clientHandle);
		};

		expect(serialize).toThrow("subscribed handle");
	});
});

describe("loadBindings", () => {
	it("should restore bindings from a serialized state", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.loadBindings(handle, { jump: { keyboard: [Enum.KeyCode.F] } });

		expect(getKeyCodes(parent, "gameplay", "jump")).toContain(Enum.KeyCode.F);
	});

	it("should round-trip via serializeBindings", () => {
		expect.assertions(1);

		const firstParent = new Instance("Folder");
		const first = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const firstHandle = first.register(firstParent, "gameplay");
		first.rebind(firstHandle, "jump", [Enum.KeyCode.F]);
		const saved = first.serializeBindings(firstHandle);

		const secondParent = new Instance("Folder");
		const second = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const secondHandle = second.register(secondParent, "gameplay");
		second.loadBindings(secondHandle, saved);

		expect(getKeyCodes(secondParent, "gameplay", "jump")).toContain(Enum.KeyCode.F);
	});

	it("should round-trip a rebound action across every context", () => {
		expect.assertions(3);

		const firstParent = new Instance("Folder");
		const first = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const firstHandle = first.register(firstParent, "gameplay", "ui");
		first.rebind(firstHandle, "jump", [Enum.KeyCode.F]);
		const saved = first.serializeBindings(firstHandle);

		const secondParent = new Instance("Folder");
		const second = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const secondHandle = second.register(secondParent, "gameplay", "ui");
		second.loadBindings(secondHandle, saved);

		expect(getKeyCodes(secondParent, "gameplay", "jump")).toContain(Enum.KeyCode.F);
		expect(getKeyCodes(secondParent, "ui", "jump")).toContain(Enum.KeyCode.F);
		expect(getKeyCodes(secondParent, "gameplay", "move")).toHaveLength(1);
	});

	it("should preserve per-context defaults when no overrides were saved", () => {
		expect.assertions(2);

		const firstParent = new Instance("Folder");
		const first = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const firstHandle = first.register(firstParent, "gameplay", "ui");
		const saved = first.serializeBindings(firstHandle);

		const secondParent = new Instance("Folder");
		const second = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const secondHandle = second.register(secondParent, "gameplay", "ui");
		second.loadBindings(secondHandle, saved);

		expect(getKeyCodes(secondParent, "gameplay", "jump")).toContain(Enum.KeyCode.Space);
		expect(getKeyCodes(secondParent, "ui", "jump")).toContain(Enum.KeyCode.Return);
	});
});

describe("loadBindings unknown action", () => {
	it("should drop keys absent from the action map and log in dev mode", () => {
		expect.assertions(2);

		_G.__DEV__ = true;
		afterThis(() => {
			_G.__DEV__ = false;
		});
		const spy = jest.spyOn(jest.globalEnv, "warn");
		spy.mockImplementation(() => {});
		afterThis(() => {
			spy.mockRestore();
		});

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.loadBindings(handle, fromAny({ unknownAction: { keyboard: [Enum.KeyCode.F] } }));

		const state = core.serializeBindings(handle) as Record<string, unknown>;

		expect(state["unknownAction"]).toBeUndefined();
		expect(spy).toHaveBeenCalledWith(expect.stringContaining("unknownAction"));
	});

	it("should drop keys absent from the action map without logging outside dev mode", () => {
		expect.assertions(2);

		const spy = jest.spyOn(jest.globalEnv, "warn");
		spy.mockImplementation(() => {});
		afterThis(() => {
			spy.mockRestore();
		});

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.loadBindings(handle, fromAny({ unknownAction: { keyboard: [Enum.KeyCode.F] } }));

		const state = core.serializeBindings(handle) as Record<string, unknown>;

		expect(state["unknownAction"]).toBeUndefined();
		expect(spy).never.toHaveBeenCalled();
	});
});

const PLATFORM_CONTEXTS = {
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.Space, Enum.KeyCode.ButtonA],
			move: [
				{
					down: Enum.KeyCode.S,
					left: Enum.KeyCode.A,
					right: Enum.KeyCode.D,
					up: Enum.KeyCode.W,
				},
			],
		},
		priority: 0,
	},
} satisfies Record<string, ContextConfig>;

/** The same contexts after a patch changed the keyboard default for `jump`. */
const PATCHED_PLATFORM_CONTEXTS = {
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.E, Enum.KeyCode.ButtonA],
			move: PLATFORM_CONTEXTS.gameplay.bindings.move,
		},
		priority: 0,
	},
} satisfies Record<string, ContextConfig>;

const TOUCH_BUTTON = new Instance("TextButton");

/** Contexts whose `jump` action declares a touch binding alongside keys. */
const TOUCH_CONTEXTS = {
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.Space, { uiButton: TOUCH_BUTTON }],
			move: PLATFORM_CONTEXTS.gameplay.bindings.move,
		},
		priority: 0,
	},
} satisfies Record<string, ContextConfig>;

const LATE_CONTEXTS = {
	gameplay: PLATFORM_CONTEXTS.gameplay,
	ui: {
		bindings: {
			jump: [Enum.KeyCode.Return, Enum.KeyCode.ButtonStart],
		},
		priority: 10,
	},
} satisfies Record<string, ContextConfig>;

describe("rebindForPlatform", () => {
	it("should leave the other platform's bindings intact", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);

		const keys = getKeyCodes(parent, "gameplay", "jump");

		expect(keys).toContain(Enum.KeyCode.Space);
		expect(keys).toContain(Enum.KeyCode.ButtonY);
	});

	it("should place bindings in a deterministic order", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", [
			Enum.KeyCode.ButtonY,
			Enum.KeyCode.ButtonX,
		]);

		expect(getKeyCodes(parent, "gameplay", "jump")).toStrictEqual([
			Enum.KeyCode.Space,
			Enum.KeyCode.ButtonY,
			Enum.KeyCode.ButtonX,
		]);
	});

	it("should order platforms by PLATFORM_ORDER, not by authored order", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebind(handle, "jump", [Enum.KeyCode.ButtonY, Enum.KeyCode.F]);

		// Authored gamepad-first; keyboard still comes back first. Reversing
		// PLATFORM_ORDER would flip this.
		expect(getKeyCodes(parent, "gameplay", "jump")).toStrictEqual([
			Enum.KeyCode.F,
			Enum.KeyCode.ButtonY,
		]);
	});

	it("should keep several bindings for the same platform in source order", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebind(handle, "jump", [Enum.KeyCode.G, Enum.KeyCode.F, Enum.KeyCode.ButtonY]);

		expect(getKeyCodes(parent, "gameplay", "jump")).toStrictEqual([
			Enum.KeyCode.G,
			Enum.KeyCode.F,
			Enum.KeyCode.ButtonY,
		]);
	});

	it("should report the composed bindings through getBindings", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);

		expect(core.getBindings(handle, "jump")).toStrictEqual([
			Enum.KeyCode.Space,
			Enum.KeyCode.ButtonY,
		]);
	});

	it("should unbind a platform when given an empty list", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", []);

		expect(getKeyCodes(parent, "gameplay", "jump")).toStrictEqual([Enum.KeyCode.Space]);
	});

	it("should preserve per-platform state in a context activated afterwards", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: LATE_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);
		core.addContext(handle, "ui");

		const keys = getKeyCodes(parent, "ui", "jump");

		expect(keys).toContain(Enum.KeyCode.Return);
		expect(keys).toContain(Enum.KeyCode.ButtonY);
	});

	it("should throw for subscribed handles", () => {
		expect.assertions(1);

		const serverParent = new Instance("Folder");
		const serverCore = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		serverCore.register(serverParent, "gameplay");

		const clientCore = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const [clientHandle] = clientCore.subscribe(serverParent, "gameplay");

		const rebind = (): void => {
			clientCore.rebindForPlatform(clientHandle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);
		};

		expect(rebind).toThrow("subscribed handle");
	});
});

describe("resetBindingsForPlatform", () => {
	it("should restore that platform's defaults and keep the other's override", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindForPlatform(handle, "jump", "keyboard", [Enum.KeyCode.F]);
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);
		core.resetBindingsForPlatform(handle, "jump", "gamepad");

		expect(getKeyCodes(parent, "gameplay", "jump")).toStrictEqual([
			Enum.KeyCode.F,
			Enum.KeyCode.ButtonA,
		]);
	});

	it("should drop the action entirely once its last bucket is reset", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);
		core.resetBindingsForPlatform(handle, "jump", "gamepad");

		expect(core.serializeBindings(handle).jump).toBeUndefined();
	});

	it("should be a no-op for a platform that was never overridden", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindForPlatform(handle, "jump", "keyboard", [Enum.KeyCode.F]);
		core.resetBindingsForPlatform(handle, "jump", "gamepad");

		expect(getKeyCodes(parent, "gameplay", "jump")).toStrictEqual([
			Enum.KeyCode.F,
			Enum.KeyCode.ButtonA,
		]);
	});

	it("should clear every platform when the whole action is reset", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindForPlatform(handle, "jump", "keyboard", [Enum.KeyCode.F]);
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);
		core.resetBindings(handle, "jump");

		expect(core.serializeBindings(handle).jump).toBeUndefined();
		expect(getKeyCodes(parent, "gameplay", "jump")).toStrictEqual([
			Enum.KeyCode.Space,
			Enum.KeyCode.ButtonA,
		]);
	});
});

describe("whole-action rebind and touch", () => {
	it("should clear the touch bucket, since it replaces every platform", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: TOUCH_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebind(handle, "jump", [Enum.KeyCode.F]);

		const saved = core.serializeBindings(handle);

		expect(getPlatformBucket(saved, "jump", "keyboard")).toStrictEqual([Enum.KeyCode.F]);
		expect(getPlatformBucket(saved, "jump", "touch")).toStrictEqual([]);
	});

	it("should leave the touch bucket absent after a per-platform rebind", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: TOUCH_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindForPlatform(handle, "jump", "keyboard", [Enum.KeyCode.F]);

		expect(getPlatformBucket(core.serializeBindings(handle), "jump", "touch")).toBeUndefined();
	});
});

describe("per-platform persistence", () => {
	it("should serialize only the platform that was rebound", () => {
		expect.assertions(3);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);

		const saved = core.serializeBindings(handle);

		expect(getPlatformBucket(saved, "jump", "gamepad")).toStrictEqual([Enum.KeyCode.ButtonY]);
		expect(getPlatformBucket(saved, "jump", "keyboard")).toBeUndefined();
		expect(getPlatformBucket(saved, "jump", "touch")).toBeUndefined();
	});

	it("should round-trip an explicitly emptied platform as unbound", () => {
		expect.assertions(2);

		const firstParent = new Instance("Folder");
		const first = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const firstHandle = first.register(firstParent, "gameplay");
		first.rebindForPlatform(firstHandle, "jump", "gamepad", []);
		const saved = first.serializeBindings(firstHandle);

		expect(getPlatformBucket(saved, "jump", "gamepad")).toStrictEqual([]);

		const secondParent = new Instance("Folder");
		const second = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const secondHandle = second.register(secondParent, "gameplay");
		second.loadBindings(secondHandle, saved);

		expect(getKeyCodes(secondParent, "gameplay", "jump")).toStrictEqual([Enum.KeyCode.Space]);
	});

	it("should round-trip an absent platform as tracking defaults", () => {
		expect.assertions(2);

		const firstParent = new Instance("Folder");
		const first = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const firstHandle = first.register(firstParent, "gameplay");
		first.rebindForPlatform(firstHandle, "jump", "keyboard", [Enum.KeyCode.F]);
		const saved = first.serializeBindings(firstHandle);

		expect(getPlatformBucket(saved, "jump", "gamepad")).toBeUndefined();

		const secondParent = new Instance("Folder");
		const second = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const secondHandle = second.register(secondParent, "gameplay");
		second.loadBindings(secondHandle, saved);

		expect(getKeyCodes(secondParent, "gameplay", "jump")).toStrictEqual([
			Enum.KeyCode.F,
			Enum.KeyCode.ButtonA,
		]);
	});

	it("should let an untouched platform inherit a patched code default", () => {
		expect.assertions(1);

		const firstParent = new Instance("Folder");
		const first = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const firstHandle = first.register(firstParent, "gameplay");
		first.rebindForPlatform(firstHandle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);
		const saved = first.serializeBindings(firstHandle);

		const patchedParent = new Instance("Folder");
		const patched = createCore({
			actions: REBIND_ACTIONS,
			contexts: PATCHED_PLATFORM_CONTEXTS,
		});
		const patchedHandle = patched.register(patchedParent, "gameplay");
		patched.loadBindings(patchedHandle, saved);

		expect(getKeyCodes(patchedParent, "gameplay", "jump")).toStrictEqual([
			Enum.KeyCode.E,
			Enum.KeyCode.ButtonY,
		]);
	});

	it("should freeze a platform the player did customize against a patch", () => {
		expect.assertions(1);

		const firstParent = new Instance("Folder");
		const first = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const firstHandle = first.register(firstParent, "gameplay");
		first.rebindForPlatform(firstHandle, "jump", "keyboard", [Enum.KeyCode.F]);
		const saved = first.serializeBindings(firstHandle);

		const patchedParent = new Instance("Folder");
		const patched = createCore({
			actions: REBIND_ACTIONS,
			contexts: PATCHED_PLATFORM_CONTEXTS,
		});
		const patchedHandle = patched.register(patchedParent, "gameplay");
		patched.loadBindings(patchedHandle, saved);

		expect(getKeyCodes(patchedParent, "gameplay", "jump")).toStrictEqual([
			Enum.KeyCode.F,
			Enum.KeyCode.ButtonA,
		]);
	});

	it("should keep binding order stable across a save and reload", () => {
		expect.assertions(1);

		const firstParent = new Instance("Folder");
		const first = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const firstHandle = first.register(firstParent, "gameplay");
		first.rebindForPlatform(firstHandle, "jump", "keyboard", [Enum.KeyCode.F, Enum.KeyCode.G]);
		first.rebindForPlatform(firstHandle, "jump", "gamepad", [
			Enum.KeyCode.ButtonY,
			Enum.KeyCode.ButtonX,
		]);
		const before = getKeyCodes(firstParent, "gameplay", "jump");

		const secondParent = new Instance("Folder");
		const second = createCore({ actions: REBIND_ACTIONS, contexts: PLATFORM_CONTEXTS });
		const secondHandle = second.register(secondParent, "gameplay");
		second.loadBindings(secondHandle, first.serializeBindings(firstHandle));

		expect(getKeyCodes(secondParent, "gameplay", "jump")).toStrictEqual(before);
	});
});
