import { describe, expect, it } from "@rbxts/jest-globals";

import { negate } from "./negate";

describe("negate", () => {
	const context = { deltaTime: 0.016 };
	const modifier = negate();

	it("should negate a positive number", () => {
		expect.assertions(1);

		expect(modifier.modify(5, context)).toBe(-5);
	});

	it("should negate a negative number", () => {
		expect.assertions(1);

		expect(modifier.modify(-3, context)).toBe(3);
	});

	it("should negate a Vector2", () => {
		expect.assertions(2);

		const result = modifier.modify(new Vector2(1, -2), context);

		expect(result.X).toBe(-1);
		expect(result.Y).toBe(2);
	});

	it("should negate a Vector3", () => {
		expect.assertions(3);

		const result = modifier.modify(new Vector3(1, -2, 3), context);

		expect(result.X).toBe(-1);
		expect(result.Y).toBe(2);
		expect(result.Z).toBe(-3);
	});
});
