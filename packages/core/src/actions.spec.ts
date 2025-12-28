import { afterThis, awaitDefer } from "@rbxts/flux-test-utils";
import { describe, expect, it } from "@rbxts/jest-globals";
import { ReplicatedStorage } from "@rbxts/services";

import { createActionState } from "./actions";

describe("actions", () => {
	it("should report unpressed when button has no input", () => {
		expect.assertions(1);

		const container = new Instance("Folder");
		container.Parent = ReplicatedStorage;
		afterThis(() => {
			container.Destroy();
		});

		const state = createActionState(["jump"], container);

		expect(state.pressed("jump")).toBe(false);
	});

	it("should report pressed when button has input", () => {
		expect.assertions(1);

		const container = new Instance("Folder");
		container.Parent = ReplicatedStorage;
		afterThis(() => {
			container.Destroy();
		});

		const state = createActionState(["jump"], container);
		state.simulateAction("jump", true);
		awaitDefer();

		expect(state.pressed("jump")).toBe(true);
	});
});
