import { describe, expect, it } from "@rbxts/jest-globals";

import { resetTriggers } from "./instantiate";
import type { TriggerInstance } from "./types";

describe("resetTriggers", () => {
	it("should reset triggers that keep state and skip those that do not", () => {
		expect.assertions(1);

		let resets = 0;
		const triggers: ReadonlyArray<TriggerInstance> = [
			{
				trigger: {
					update(): "none" {
						return "none";
					},
				},
				type: "explicit",
			},
			{
				trigger: {
					reset(): void {
						resets += 1;
					},
					update(): "none" {
						return "none";
					},
				},
				type: "explicit",
			},
		];

		resetTriggers(triggers);

		expect(resets).toBe(1);
	});
});
