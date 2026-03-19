import { describe, expect, it } from "@rbxts/jest-globals";

import { defineContexts } from "./define";

describe("defineContexts", () => {
	it("should return the same contexts object", () => {
		expect.assertions(2);

		const contexts = defineContexts({
			gameplay: {
				bindings: {
					jump: [Enum.KeyCode.Space],
				},
				priority: 0,
			},
		});

		expect(contexts.gameplay.priority).toBe(0);
		expect(contexts.gameplay.bindings.jump).toStrictEqual([Enum.KeyCode.Space]);
	});

	it("should preserve sink property", () => {
		expect.assertions(2);

		const contexts = defineContexts({
			ui: {
				bindings: {},
				priority: 10,
				sink: true,
			},
		});

		expect(contexts.ui.sink).toBe(true);
		expect(contexts.ui.priority).toBe(10);
	});

	it("should support multiple contexts", () => {
		expect.assertions(3);

		const contexts = defineContexts({
			driving: { bindings: {}, priority: 5 },
			gameplay: { bindings: {}, priority: 0 },
			ui: { bindings: {}, priority: 10, sink: true },
		});

		expect(contexts.gameplay.priority).toBe(0);
		expect(contexts.driving.priority).toBe(5);
		expect(contexts.ui.priority).toBe(10);
	});
});
