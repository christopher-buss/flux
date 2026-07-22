import { awaitDefer } from "@flux/test-utils";
import { describe, expect, it } from "@rbxts/jest-globals";

import type { ActionMap } from "../types/actions";
import type { ContextConfig } from "../types/contexts";
import { findInputInstances } from "./find-instances";
import type { InputInstanceData } from "./input-instances";
import {
	addContextInstances,
	createInputInstances,
	destroyInputInstances,
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

function contextActions(data: InputInstanceData, contextName: string): Map<string, InputAction> {
	const actions = data.actionsByContext.get(contextName);
	assert(actions, `no instances for context: ${contextName}`);
	return actions;
}

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

		expect(contextActions(found, "gameplay").has("jump")).toBeTrue();
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

	it("should destroy dynamically-added instances even when not owned", () => {
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

		addContextInstances("ui", TEST_CONTEXTS.ui, TEST_ACTIONS, found);

		const inputFolder = parent.FindFirstChild("input");
		assert(inputFolder);

		expect(inputFolder.FindFirstChild("ui")).toBeDefined();

		destroyInputInstances(found);

		expect(inputFolder.FindFirstChild("ui")).toBeUndefined();
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
		expect(contextActions(found, "gameplay").has("jump")).toBeTrue();
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

	it("should discover an InputAction for every declaring context", () => {
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

		expect(contextActions(found, "gameplay").get("jump")).never.toBe(
			contextActions(found, "ui").get("jump"),
		);
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

		expect(contextActions(found, "gameplay").has("jump")).toBeTrue();
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
