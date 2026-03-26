import { describe, expect, it } from "@rbxts/jest-globals";

import { deadZone, negate, scale } from "../../src/modifiers";

describe("modifier chaining", () => {
	const context = { deltaTime: 0.016 };

	it("should chain deadZone then scale", () => {
		expect.assertions(1);

		const deadZoneModifier = deadZone(0.2);
		const scaleModifier = scale(2);

		// 0.6 through deadZone(0.2) = 0.5, then scale(2) = 1.0
		const afterDeadZone = deadZoneModifier.modify(0.6, context);
		const result = scaleModifier.modify(afterDeadZone, context);

		expect(result).toBeCloseTo(1);
	});

	it("should chain negate then scale", () => {
		expect.assertions(1);

		const negateModifier = negate();
		const scaleModifier = scale(3);

		const afterNegate = negateModifier.modify(5, context);
		const result = scaleModifier.modify(afterNegate, context);

		expect(result).toBe(-15);
	});
});
