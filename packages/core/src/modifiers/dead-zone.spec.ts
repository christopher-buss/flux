import { describe, expect, it } from "@rbxts/jest-globals";

import { deadZone } from "./dead-zone";

describe("deadZone", () => {
	const context = { deltaTime: 0.016 };
	const modifier = deadZone(0.2);

	describe("number", () => {
		it("should return 0 when below threshold", () => {
			expect.assertions(1);

			expect(modifier.modify(0.1, context)).toBe(0);
		});

		it("should return 0 when negative and below threshold", () => {
			expect.assertions(1);

			expect(modifier.modify(-0.15, context)).toBe(0);
		});

		it("should rescale value above threshold with no jump discontinuity", () => {
			expect.assertions(1);

			// Input 0.6, threshold 0.2: (0.6 - 0.2) / (1 - 0.2) = 0.5
			expect(modifier.modify(0.6, context)).toBeCloseTo(0.5);
		});

		it("should return 1 when input is 1", () => {
			expect.assertions(1);

			expect(modifier.modify(1, context)).toBeCloseTo(1);
		});

		it("should handle negative values above threshold", () => {
			expect.assertions(1);

			// Input -0.6, threshold 0.2: -1 * (0.6 - 0.2) / (1 - 0.2) = -0.5
			expect(modifier.modify(-0.6, context)).toBeCloseTo(-0.5);
		});

		it("should return near-zero just above threshold", () => {
			expect.assertions(1);

			expect(modifier.modify(0.21, context)).toBeCloseTo(0.0125);
		});
	});

	describe("vector2", () => {
		it("should return Vector2.zero when magnitude below threshold", () => {
			expect.assertions(1);

			const result = modifier.modify(new Vector2(0.1, 0.1), context);

			expect(result).toBe(Vector2.zero);
		});

		it("should rescale vector above threshold", () => {
			expect.assertions(1);

			/**
			 * Magnitude = 1.0.
			 */
			const input = new Vector2(0.6, 0.8);
			const result = modifier.modify(input, context);

			// magnitude 1.0, threshold 0.2: (1.0 - 0.2) / (1 - 0.2) = 1.0
			expect(result.Magnitude).toBeCloseTo(1);
		});
	});

	describe("vector3", () => {
		it("should return Vector3.zero when magnitude below threshold", () => {
			expect.assertions(1);

			const result = modifier.modify(new Vector3(0.05, 0.05, 0.05), context);

			expect(result).toBe(Vector3.zero);
		});

		it("should rescale vector above threshold", () => {
			expect.assertions(1);

			/**
			 * Magnitude = 1.0.
			 */
			const input = new Vector3(0, 0.6, 0.8);
			const result = modifier.modify(input, context);

			expect(result.Magnitude).toBeCloseTo(1);
		});
	});
});
