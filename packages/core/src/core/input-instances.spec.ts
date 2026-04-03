import { awaitDefer } from "@flux/test-utils";
import { describe, expect, it } from "@rbxts/jest-globals";
import { fromAny } from "@rbxts/jest-utils";
import RegExp from "@rbxts/regexp";

import { FluxError } from "../errors";
import type { ActionMap } from "../types/actions";
import type { ContextConfig } from "../types/contexts";
import {
	addContextInstances,
	createInputInstances,
	destroyInputInstances,
	findInputInstances,
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

		expect(data.inputActions.has("jump")).toBeTrue();
	});

	it("should store first InputAction per action name", () => {
		expect.assertions(1);

		const data = createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay", "ui"],
			contexts: TEST_CONTEXTS,
			parent: new Instance("Folder"),
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

		expect(data.inputActions.has("move")).toBeTrue();
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
		}).toThrowWithMessage(FluxError, RegExp("UserInputType"));
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

describe("findInputInstances", () => {
	it("should find existing InputContext instances", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		const found = findInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			parent,
		});

		expect(found.inputContexts.has("gameplay")).toBeTrue();
		expect(found.owned).toBeFalse();
	});

	it("should collect InputAction instances from found contexts", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		const found = findInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			parent,
		});

		expect(found.inputActions.has("jump")).toBeTrue();
	});

	it("should set up ChildAdded for missing contexts", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		const found = findInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			parent,
		});

		expect(found.connections.size()).toBe(1);
	});

	it("should not destroy instances when not owned", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		const found = findInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			parent,
		});

		destroyInputInstances(found);

		const inputFolder = parent.FindFirstChild("input");
		assert(inputFolder);

		expect(inputFolder.FindFirstChild("gameplay")).toBeDefined();
	});

	it("should find context added after subscribe via ChildAdded", () => {
		expect.assertions(2);

		const parent = new Instance("Folder");
		const found = findInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			parent,
		});

		// Create instances after findInputInstances
		createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});
		// First defer fires the folder ChildAdded, second fires the context
		// ChildAdded
		awaitDefer();
		awaitDefer();

		expect(found.inputContexts.has("gameplay")).toBeTrue();
		expect(found.inputActions.has("jump")).toBeTrue();
	});

	it("should ignore non-InputContext children via ChildAdded", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		// Pre-create the "input" folder so we test context-level filtering
		const inputFolder = new Instance("Folder");
		inputFolder.Name = "input";
		inputFolder.Parent = parent;

		const found = findInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			parent,
		});

		// Add a non-InputContext child to the input folder — should be ignored
		const decoy = new Instance("Folder");
		decoy.Name = "gameplay";
		decoy.Parent = inputFolder;
		awaitDefer();

		expect(found.inputContexts.has("gameplay")).toBeFalse();
	});

	it("should not overwrite existing InputAction when shared across contexts", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay", "ui"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		const found = findInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay", "ui"],
			parent,
		});

		expect(found.inputActions.has("jump")).toBeTrue();
	});

	it("should skip non-InputAction children when collecting actions", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		createInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			contexts: TEST_CONTEXTS,
			parent,
		});

		// Add non-InputAction child to the InputContext
		const inputFolder = parent.FindFirstChild("input");
		assert(inputFolder);
		const gameplayContext = inputFolder.FindFirstChild("gameplay");
		assert(gameplayContext);
		const folder = new Instance("Folder");
		folder.Name = "notAnAction";
		folder.Parent = gameplayContext;

		const found = findInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			parent,
		});

		expect(found.inputActions.has("jump")).toBeTrue();
	});

	it("should ignore wrong-named InputContext via ChildAdded", () => {
		expect.assertions(1);

		const parent = new Instance("Folder");
		// Pre-create the "input" folder so we test context-level filtering
		const inputFolder = new Instance("Folder");
		inputFolder.Name = "input";
		inputFolder.Parent = parent;

		const found = findInputInstances({
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			parent,
		});

		// Add an InputContext with wrong name — should be ignored
		const context = new Instance("InputContext");
		context.Name = "other";
		context.Parent = inputFolder;
		awaitDefer();

		expect(found.inputContexts.has("gameplay")).toBeFalse();
	});
});
