import { describe, expect, it } from "@rbxts/jest-globals";

import type { ActionMap } from "../types/actions";
import type { ContextConfig } from "../types/contexts";
import {
	addContextInstances,
	createInputInstances,
	destroyInputInstances,
	setContextEnabled,
} from "./input-instances";

const TEST_ACTIONS = {
	jump: { type: "Bool" as const },
	move: { type: "Direction2D" as const },
} satisfies ActionMap;

const TEST_CONTEXTS = {
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.Space],
			move: [Enum.KeyCode.W],
		},
		priority: 0,
	},
	ui: {
		bindings: {
			jump: [Enum.KeyCode.Return],
		},
		priority: 10,
		sink: true,
	},
} satisfies Record<string, ContextConfig>;

describe("createInputInstances", () => {
	it("should create InputContext instances for each context", () => {
		expect.assertions(2);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay", "ui"],
			contexts: TEST_CONTEXTS,
		});

		expect(data.inputContexts.size()).toBe(2);
		expect(data.inputContexts.has("gameplay")).toBeTrue();
	});

	it("should create InputAction instances for bound actions", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
		});

		expect(data.inputActions.has("jump")).toBeTrue();
	});

	it("should store first InputAction per action name", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay", "ui"],
			contexts: TEST_CONTEXTS,
		});

		const jumpAction = data.inputActions.get("jump");

		expect(jumpAction).toBeDefined();
	});

	it("should track all created instances for cleanup", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
		});

		expect(data.instances.size()).toBeGreaterThan(0);
	});

	it("should skip bindings for actions not in the action map", () => {
		expect.assertions(1);

		const contexts = {
			gameplay: {
				bindings: {
					jump: [Enum.KeyCode.Space],
					nonexistent: [Enum.KeyCode.E],
				},
				priority: 0,
			},
		} satisfies Record<string, ContextConfig>;

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts,
		});

		expect(data.inputActions.has("nonexistent")).toBeFalse();
	});

	it("should configure directional bindings from record presets", () => {
		expect.assertions(1);

		const actions = {
			move: { type: "Direction2D" as const },
		} satisfies ActionMap;

		const contexts = {
			gameplay: {
				bindings: {
					move: [
						{
							Backward: Enum.KeyCode.S,
							Forward: Enum.KeyCode.W,
							Left: Enum.KeyCode.A,
							Right: Enum.KeyCode.D,
						},
					],
				},
				priority: 0,
			},
		} satisfies Record<string, ContextConfig>;

		const data = createInputInstances({
			actions,
			contextNames: ["gameplay"],
			contexts,
		});

		expect(data.inputActions.has("move")).toBeTrue();
	});

	it("should skip UserInputType bindings", () => {
		expect.assertions(1);

		const actions = {
			aim: { type: "Bool" as const },
		} satisfies ActionMap;

		const contexts = {
			gameplay: {
				bindings: {
					aim: [Enum.UserInputType.MouseButton2],
				},
				priority: 0,
			},
		} satisfies Record<string, ContextConfig>;

		const data = createInputInstances({
			actions,
			contextNames: ["gameplay"],
			contexts,
		});

		expect(data.inputActions.has("aim")).toBeTrue();
	});

	it("should set priority and sink on InputContext", () => {
		expect.assertions(2);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["ui"],
			contexts: TEST_CONTEXTS,
		});

		const uiContext = data.inputContexts.get("ui");
		assert(uiContext);

		expect(uiContext.Priority).toBe(10);
		expect(uiContext.Sink).toBeTrue();
	});

	it("should set Parent on InputContext when parent is provided", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		const gameplayContext = data.inputContexts.get("gameplay");
		assert(gameplayContext);

		expect(gameplayContext.Parent).toBe(parent);
	});

	it("should not set Parent when parent is omitted", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
		});

		const gameplayContext = data.inputContexts.get("gameplay");
		assert(gameplayContext);

		expect(gameplayContext.Parent).toBeUndefined();
	});
});

describe("destroyInputInstances", () => {
	it("should destroy all tracked instances", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
		});

		const instanceCount = data.instances.size();
		destroyInputInstances(data);

		expect(instanceCount).toBeGreaterThan(0);
	});
});

describe("addContextInstances", () => {
	it("should add a new InputContext to existing data", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
		});

		addContextInstances("ui", TEST_CONTEXTS.ui, TEST_ACTIONS, data);

		expect(data.inputContexts.has("ui")).toBeTrue();
	});

	it("should set Parent on added context when parent is stored", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		addContextInstances("ui", TEST_CONTEXTS.ui, TEST_ACTIONS, data);
		const uiContext = data.inputContexts.get("ui");
		assert(uiContext);

		expect(uiContext.Parent).toBe(parent);
	});
});

describe("setContextEnabled", () => {
	it("should enable an InputContext", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
		});

		setContextEnabled(data, "gameplay", false);
		const context = data.inputContexts.get("gameplay");
		assert(context);

		expect(context.Enabled).toBeFalse();
	});

	it("should be a no-op for nonexistent context names", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
		});

		// Should not throw
		setContextEnabled(data, "nonexistent", true);

		expect(data.inputContexts.has("nonexistent")).toBeFalse();
	});
});
