import { describe, expect, it } from "@rbxts/jest-globals";

import { createActionState } from "./actions";

describe("actions", () => {
	it("should report unpressed when button has no input", () => {
		expect.assertions(1);

		const state = createActionState();

		expect(state.pressed("jump")).toBe(false);
	});

	it("should report pressed when button has input", () => {
		expect.assertions(1);

		const state = createActionState();
		state.simulateAction("jump", true);

		expect(state.pressed("jump")).toBe(true);
	});
});
