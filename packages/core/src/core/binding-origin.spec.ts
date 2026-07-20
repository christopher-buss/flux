import { describe, expect, it } from "@rbxts/jest-globals";
import { fromAny } from "@rbxts/jest-utils";

import type { ActionMap } from "../types/actions";
import type { ContextConfig } from "../types/contexts";
import { createCore } from "./create-core";

const ORIGIN_ACTIONS = {
	aim: { type: "ViewportPosition" as const },
	jump: { type: "Bool" as const },
	move: { type: "Direction2D" as const },
} satisfies ActionMap;

const ORIGIN_CONTEXTS = {
	gameplay: {
		bindings: {
			aim: [{ pointerIndex: 1 }],
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
	ui: {
		bindings: {
			jump: [Enum.KeyCode.Return],
		},
		priority: 10,
	},
} satisfies Record<string, ContextConfig>;

describe("getBindingOrigin", () => {
	it("should report a declared action with no override as a default", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");

		expect(core.getBindingOrigin(handle, "jump", "keyboard", "gameplay")).toBe("default");
	});

	it("should report different origins for two platforms on the same action", () => {
		expect.assertions(2);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);

		expect(core.getBindingOrigin(handle, "jump", "gamepad", "gameplay")).toBe("override");
		expect(core.getBindingOrigin(handle, "jump", "keyboard", "gameplay")).toBe("default");
	});

	it("should report a deliberately unbound platform as an override", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.rebindForPlatform(handle, "jump", "keyboard", []);

		expect(core.getBindingOrigin(handle, "jump", "keyboard", "gameplay")).toBe("override");
	});

	it("should report an action the context does not declare as undeclared", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay", "ui");

		expect(core.getBindingOrigin(handle, "move", "keyboard", "ui")).toBe("undeclared");
	});

	it("should let a context declaration outrank an override when scoped", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay", "ui");
		core.rebindForPlatform(handle, "move", "keyboard", [Enum.KeyCode.Up]);

		// "ui" has no InputAction for "move", so the override never reaches it.
		expect(core.getBindingOrigin(handle, "move", "keyboard", "ui")).toBe("undeclared");
	});

	it("should let an override win when the read names no context", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay", "ui");
		core.rebindForPlatform(handle, "move", "keyboard", [Enum.KeyCode.Up]);

		expect(core.getBindingOrigin(handle, "move", "keyboard")).toBe("override");
	});

	it("should report an action missing from the action map as undeclared", () => {
		expect.assertions(1);

		const contexts = {
			gameplay: {
				bindings: { jump: [Enum.KeyCode.Space], removed: [Enum.KeyCode.F] },
				priority: 0,
			},
		} satisfies Record<string, ContextConfig>;
		const core = createCore({ actions: ORIGIN_ACTIONS, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");

		expect(core.getBindingOrigin(handle, fromAny("removed"), "keyboard", "gameplay")).toBe(
			"undeclared",
		);
	});

	it("should report a declared touch binding as a default", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");

		expect(core.getBindingOrigin(handle, "aim", "touch", "gameplay")).toBe("default");
	});

	it("should report touch as an override after a whole-action rebind", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.rebind(handle, "aim", [{ pointerIndex: 2 }]);

		expect(core.getBindingOrigin(handle, "aim", "touch", "gameplay")).toBe("override");
	});

	it("should return to a default after the platform is reset", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);
		core.resetBindingsForPlatform(handle, "jump", "gamepad");

		expect(core.getBindingOrigin(handle, "jump", "gamepad", "gameplay")).toBe("default");
	});

	it("should consult every active context when no context is given", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");

		expect(core.getBindingOrigin(handle, "move", "keyboard")).toBe("default");
	});

	it("should report undeclared when no active context declares the action", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "ui");

		expect(core.getBindingOrigin(handle, "move", "keyboard")).toBe("undeclared");
	});

	it("should reject an unknown context name", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");

		expect(() => {
			core.getBindingOrigin(handle, "jump", "keyboard", fromAny("nonexistent"));
		}).toThrow("unknown context");
	});
});

describe("getBindingsForPlatform", () => {
	it("should return the declared bindings that target the platform", () => {
		expect.assertions(2);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");

		const keyboard = core.getBindingsForPlatform(handle, "jump", "keyboard", "gameplay");

		expect(keyboard).toHaveLength(1);
		expect(keyboard[0]).toBe(Enum.KeyCode.Space);
	});

	it("should return the override bucket for an overridden platform", () => {
		expect.assertions(2);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);

		const gamepad = core.getBindingsForPlatform(handle, "jump", "gamepad", "gameplay");

		expect(gamepad).toHaveLength(1);
		expect(gamepad[0]).toBe(Enum.KeyCode.ButtonY);
	});

	it("should return a bucket's contents even when they classify elsewhere", () => {
		expect.assertions(2);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.rebindForPlatform(handle, "jump", "keyboard", [Enum.KeyCode.ButtonY]);

		const keyboard = core.getBindingsForPlatform(handle, "jump", "keyboard", "gameplay");

		expect(keyboard).toHaveLength(1);
		expect(keyboard[0]).toBe(Enum.KeyCode.ButtonY);
	});

	it("should return an empty list for a deliberately unbound platform", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.rebindForPlatform(handle, "jump", "keyboard", []);

		expect(core.getBindingsForPlatform(handle, "jump", "keyboard", "gameplay")).toHaveLength(0);
	});

	it("should leave untouched platforms tracking their declared bindings", () => {
		expect.assertions(2);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);

		const keyboard = core.getBindingsForPlatform(handle, "jump", "keyboard", "gameplay");

		expect(keyboard).toHaveLength(1);
		expect(keyboard[0]).toBe(Enum.KeyCode.Space);
	});

	it("should merge across active contexts when no context is given", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay", "ui");

		expect(core.getBindingsForPlatform(handle, "jump", "keyboard")).toHaveLength(2);
	});

	it("should return an empty list for an undeclared action", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay", "ui");

		expect(core.getBindingsForPlatform(handle, "move", "keyboard", "ui")).toHaveLength(0);
	});

	it("should reject an unknown context name", () => {
		expect.assertions(1);

		const core = createCore({ actions: ORIGIN_ACTIONS, contexts: ORIGIN_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");

		expect(() => {
			core.getBindingsForPlatform(handle, "jump", "keyboard", fromAny("nonexistent"));
		}).toThrow("unknown context");
	});
});
