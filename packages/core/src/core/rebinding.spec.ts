import { describe, expect, it, jest } from "@rbxts/jest-globals";
import { afterThis, fromAny } from "@rbxts/jest-utils";

import type { ActionMap } from "../types/actions";
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

describe("rebindAll", () => {
	it("should replace all bindings", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const core = createCore({ actions: REBIND_ACTIONS, contexts: REBIND_CONTEXTS });
		const handle = core.register(parent, "gameplay");
		core.rebindAll(handle, {
			jump: [Enum.KeyCode.F],
			move: [
				{
					down: Enum.KeyCode.K,
					left: Enum.KeyCode.J,
					right: Enum.KeyCode.L,
					up: Enum.KeyCode.I,
				},
			],
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
			move: [
				{
					down: Enum.KeyCode.K,
					left: Enum.KeyCode.J,
					right: Enum.KeyCode.L,
					up: Enum.KeyCode.I,
				},
			],
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

		expect(state.jump).toContain(Enum.KeyCode.F);
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
		core.loadBindings(handle, { jump: [Enum.KeyCode.F] });

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
		core.loadBindings(handle, fromAny({ unknownAction: [Enum.KeyCode.F] }));

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
		core.loadBindings(handle, fromAny({ unknownAction: [Enum.KeyCode.F] }));

		const state = core.serializeBindings(handle) as Record<string, unknown>;

		expect(state["unknownAction"]).toBeUndefined();
		expect(spy).never.toHaveBeenCalled();
	});
});
