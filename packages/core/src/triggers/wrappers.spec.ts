import { describe, expect, it } from "@rbxts/jest-globals";

import type { Trigger } from "./types";
import { blocker, explicit, implicit } from "./wrappers";

describe("trigger wrappers", () => {
	const mockTrigger: Trigger = {
		/**
		 * Intentionally empty for mock.
		 */
		reset(): void {},
		update(): "none" {
			return "none";
		},
	};

	it("should wrap with implicit type", () => {
		expect.assertions(1);

		expect(implicit(mockTrigger).type).toBe("implicit");
	});

	it("should wrap with explicit type", () => {
		expect.assertions(1);

		expect(explicit(mockTrigger).type).toBe("explicit");
	});

	it("should wrap with blocker type", () => {
		expect.assertions(1);

		expect(blocker(mockTrigger).type).toBe("blocker");
	});

	it("should preserve the trigger reference", () => {
		expect.assertions(3);

		expect(implicit(mockTrigger).trigger).toBe(mockTrigger);
		expect(explicit(mockTrigger).trigger).toBe(mockTrigger);
		expect(blocker(mockTrigger).trigger).toBe(mockTrigger);
	});
});
