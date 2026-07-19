import { describe, expect, it } from "@rbxts/jest-globals";

import type { ActionsByContext } from "./resolve-action";
import { resolveActionInstance } from "./resolve-action";

function makeAction(name: string): InputAction {
	const inputAction = new Instance("InputAction");
	inputAction.Name = name;
	return inputAction;
}

function makeInstances(entries: ReadonlyArray<[string, string, InputAction]>): ActionsByContext {
	const byContext = new Map<string, Map<string, InputAction>>();
	for (const [contextName, actionName, inputAction] of entries) {
		let actions = byContext.get(contextName);
		if (actions === undefined) {
			actions = new Map<string, InputAction>();
			byContext.set(contextName, actions);
		}

		actions.set(actionName, inputAction);
	}

	return byContext;
}

describe("resolveActionInstance", () => {
	it("should return the first ordered context's instance", () => {
		expect.assertions(1);

		const uiLook = makeAction("look");
		const gameplayLook = makeAction("look");
		const instances = makeInstances([
			["ui", "look", uiLook],
			["gameplay", "look", gameplayLook],
		]);

		expect(resolveActionInstance(instances, ["ui", "gameplay"], "look")).toBe(uiLook);
	});

	it("should fall through to the next context when the winner is gone", () => {
		expect.assertions(1);

		const uiLook = makeAction("look");
		const gameplayLook = makeAction("look");
		const instances = makeInstances([
			["ui", "look", uiLook],
			["gameplay", "look", gameplayLook],
		]);

		expect(resolveActionInstance(instances, ["gameplay"], "look")).toBe(gameplayLook);
	});

	it("should obey resolution order over storage order", () => {
		expect.assertions(1);

		// Equal-priority contexts reach here already ordered by recency, so the
		// caller's order must beat the order the instances were stored in.
		const first = makeAction("jump");
		const second = makeAction("jump");
		const instances = makeInstances([
			["first", "jump", first],
			["second", "jump", second],
		]);

		expect(resolveActionInstance(instances, ["second", "first"], "jump")).toBe(second);
	});

	it("should skip contexts that declare no instance for the action", () => {
		expect.assertions(1);

		const gameplayLook = makeAction("look");
		const instances = makeInstances([
			["ui", "jump", makeAction("jump")],
			["gameplay", "look", gameplayLook],
		]);

		expect(resolveActionInstance(instances, ["ui", "gameplay"], "look")).toBe(gameplayLook);
	});

	it("should return undefined when no ordered context has an instance", () => {
		expect.assertions(1);

		const instances = makeInstances([["gameplay", "look", makeAction("look")]]);

		expect(resolveActionInstance(instances, ["ui"], "look")).toBeUndefined();
	});
});
