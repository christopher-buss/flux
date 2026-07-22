import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis, fromAny } from "@rbxts/jest-utils";

import type { ActionMap } from "../types/actions";
import { DEFAULT_CONTEXT_PRIORITY } from "../types/contexts";
import type { ContextConfig } from "../types/contexts";
import type { InputInstanceData } from "./input-instances";
import {
	addContextInstances,
	adoptContextInstances,
	createInputInstances,
	destroyInputInstances,
	fillContextActions,
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

/** Registers a context whose only binding names no input source. */
function registerSourcelessBinding(): void {
	createInputInstances({
		actions: { aim: { type: "Bool" } } satisfies ActionMap,
		contextNames: ["gameplay"],
		contexts: {
			gameplay: {
				bindings: { aim: [{ pressedThreshold: 0.5 }] },
				priority: 0,
			},
		} satisfies Record<string, ContextConfig>,
		parent: new Instance("Folder"),
	});
}

function contextActions(data: InputInstanceData, contextName: string): Map<string, InputAction> {
	const actions = data.actionsByContext.get(contextName);
	assert(actions, `no instances for context: ${contextName}`);
	return actions;
}

describe("createInputInstances", () => {
	it("should create InputContext instances for each context", () => {
		expect.assertions(2);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay", "ui"],
			contexts: TEST_CONTEXTS,
			parent: new Instance("Folder"),
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
			parent: new Instance("Folder"),
		});

		expect(contextActions(data, "gameplay").has("jump")).toBeTrue();
	});

	it("should keep a separate InputAction per declaring context", () => {
		expect.assertions(3);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay", "ui"],
			contexts: TEST_CONTEXTS,
			parent: new Instance("Folder"),
		});

		const gameplayJump = contextActions(data, "gameplay").get("jump");
		const uiJump = contextActions(data, "ui").get("jump");

		expect(gameplayJump).toBeDefined();
		expect(uiJump).toBeDefined();
		expect(gameplayJump).never.toBe(uiJump);
	});

	it("should track all created instances for cleanup", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent: new Instance("Folder"),
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
			parent: new Instance("Folder"),
		});

		expect(contextActions(data, "gameplay").has("nonexistent")).toBeFalse();
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

		const data = createInputInstances({
			actions,
			contextNames: ["gameplay"],
			contexts,
			parent: new Instance("Folder"),
		});

		expect(contextActions(data, "gameplay").has("move")).toBeTrue();
	});

	it("should map chord modifiers onto the InputBinding", () => {
		expect.assertions(3);

		const actions = {
			ability: { type: "Bool" as const },
		} satisfies ActionMap;

		const contexts = {
			gameplay: {
				bindings: {
					ability: [
						{
							keyCode: Enum.KeyCode.C,
							primaryModifier: Enum.KeyCode.LeftControl,
							secondaryModifier: Enum.KeyCode.LeftShift,
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
			parent: new Instance("Folder"),
		});

		const abilityAction = contextActions(data, "gameplay").get("ability");
		assert(abilityAction);
		const binding = abilityAction.FindFirstChildOfClass("InputBinding");
		assert(binding);

		expect(binding.KeyCode).toBe(Enum.KeyCode.C);
		expect(binding.PrimaryModifier).toBe(Enum.KeyCode.LeftControl);
		expect(binding.SecondaryModifier).toBe(Enum.KeyCode.LeftShift);
	});

	it("should leave the secondary modifier unset for a two-key chord", () => {
		expect.assertions(2);

		const actions = {
			ability: { type: "Bool" as const },
		} satisfies ActionMap;

		const contexts = {
			gameplay: {
				bindings: {
					ability: [
						{
							keyCode: Enum.KeyCode.C,
							primaryModifier: Enum.KeyCode.LeftControl,
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
			parent: new Instance("Folder"),
		});

		const abilityAction = contextActions(data, "gameplay").get("ability");
		assert(abilityAction);
		const binding = abilityAction.FindFirstChildOfClass("InputBinding");
		assert(binding);

		expect(binding.PrimaryModifier).toBe(Enum.KeyCode.LeftControl);
		expect(binding.SecondaryModifier).toBe(Enum.KeyCode.Unknown);
	});

	it("should throw on UserInputType bindings", () => {
		expect.assertions(1);

		const actions = {
			aim: { type: "Bool" as const },
		} satisfies ActionMap;

		const contexts = {
			gameplay: {
				bindings: {
					aim: fromAny([Enum.UserInputType.MouseButton2]),
				},
				priority: 0,
			},
		} satisfies Record<string, ContextConfig>;

		expect(() => {
			createInputInstances({
				actions,
				contextNames: ["gameplay"],
				contexts,
				parent: new Instance("Folder"),
			});
		}).toThrow("UserInputType");
	});

	it("should throw when a keycode field holds something other than a KeyCode", () => {
		expect.assertions(1);

		const actions = {
			aim: { type: "Bool" as const },
		} satisfies ActionMap;

		const contexts = {
			gameplay: {
				bindings: {
					aim: fromAny([{ keyCode: Enum.UserInputType.MouseButton2 }]),
				},
				priority: 0,
			},
		} satisfies Record<string, ContextConfig>;

		expect(() => {
			createInputInstances({
				actions,
				contextNames: ["gameplay"],
				contexts,
				parent: new Instance("Folder"),
			});
		}).toThrow("no input source");
	});

	it("should throw naming the action when a binding has no input source", () => {
		expect.assertions(1);

		expect(() => {
			registerSourcelessBinding();
		}).toThrow("aim");
	});

	it("should throw on a binding with no input source outside dev mode", () => {
		expect.assertions(1);

		const isDevelopmentMode = _G.__DEV__;
		_G.__DEV__ = false;
		afterThis(() => {
			_G.__DEV__ = isDevelopmentMode;
		});

		expect(() => {
			registerSourcelessBinding();
		}).toThrow("aim");
	});

	it("should set priority and sink on InputContext", () => {
		expect.assertions(2);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["ui"],
			contexts: TEST_CONTEXTS,
			parent: new Instance("Folder"),
		});

		const uiContext = data.inputContexts.get("ui");
		assert(uiContext);

		expect(uiContext.Priority).toBe(10);
		expect(uiContext.Sink).toBeTrue();
	});

	it("should use default priority when not specified", () => {
		expect.assertions(1);

		const contexts = {
			defaults: {
				bindings: { jump: [Enum.KeyCode.Space] },
			},
		} satisfies Record<string, ContextConfig>;

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["defaults"],
			contexts,
			parent: new Instance("Folder"),
		});

		const context = data.inputContexts.get("defaults");
		assert(context);

		expect(context.Priority).toBe(DEFAULT_CONTEXT_PRIORITY);
	});

	it("should create an 'input' folder under the parent", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		const inputFolder = parent.FindFirstChild("input");

		expect(inputFolder).toBeDefined();
		expect(classIs(inputFolder!, "Folder")).toBeTrue();
	});

	it("should parent InputContext under the 'input' folder", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		const inputFolder = parent.FindFirstChild("input");
		assert(inputFolder);

		const gameplayContext = data.inputContexts.get("gameplay");
		assert(gameplayContext);

		expect(gameplayContext.Parent).toBe(inputFolder);
		expect(inputFolder.FindFirstChild("gameplay")).toBeDefined();
	});

	it("should reuse existing 'input' folder on same parent", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["ui"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		const children = parent.GetChildren().filter((child) => child.Name === "input");

		expect(children.size()).toBe(1);
	});

	it("should mark data as owned", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent: new Instance("Folder"),
		});

		expect(data.owned).toBeTrue();
	});
});

describe("destroyInputInstances", () => {
	it("should destroy all tracked instances", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent: new Instance("Folder"),
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
			parent: new Instance("Folder"),
		});

		addContextInstances("ui", TEST_CONTEXTS.ui, TEST_ACTIONS, data);

		expect(data.inputContexts.has("ui")).toBeTrue();
	});

	it("should parent added context under the 'input' folder", () => {
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

		const inputFolder = parent.FindFirstChild("input");

		expect(uiContext.Parent).toBe(inputFolder);
	});
});

describe("fillContextActions", () => {
	/**
	 * Adopts a childless InputContext planted under the parent's "input" folder.
	 * @param data - The instance data to adopt into.
	 * @param parent - The instance holding the "input" folder.
	 * @returns The planted, childless InputContext.
	 */
	function adoptEmptyContext(data: InputInstanceData, parent: Instance): InputContext {
		const inputFolder = parent.FindFirstChild("input");
		assert(inputFolder, "no input folder");
		const inputContext = new Instance("InputContext");
		inputContext.Name = "ui";
		inputContext.Parent = inputFolder;
		adoptContextInstances(data, "ui", inputContext, TEST_ACTIONS);
		return inputContext;
	}

	it("should create the InputActions the context is missing", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		fillContextActions({
			actions: TEST_ACTIONS,
			contextConfig: TEST_CONTEXTS.ui,
			contextName: "ui",
			data,
			inputContext: adoptEmptyContext(data, parent),
		});

		expect(contextActions(data, "ui").has("jump")).toBeTrue();
	});

	it("should keep an InputAction the context already has", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		const inputContext = new Instance("InputContext");
		inputContext.Name = "ui";
		const existing = new Instance("InputAction");
		existing.Name = "jump";
		existing.Parent = inputContext;
		adoptContextInstances(data, "ui", inputContext, TEST_ACTIONS);

		fillContextActions({
			actions: TEST_ACTIONS,
			contextConfig: TEST_CONTEXTS.ui,
			contextName: "ui",
			data,
			inputContext,
		});

		expect(contextActions(data, "ui").get("jump")).toBe(existing);
	});
});

describe("setContextEnabled", () => {
	it("should enable an InputContext", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent: new Instance("Folder"),
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
			parent: new Instance("Folder"),
		});

		// Should not throw
		setContextEnabled(data, "nonexistent", true);

		expect(data.inputContexts.has("nonexistent")).toBeFalse();
	});
});
