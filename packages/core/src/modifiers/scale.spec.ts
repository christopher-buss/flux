import { describe, expect, it } from "@rbxts/jest-globals";

import type { InputHandle } from "../types/core";
import { scale } from "./scale";
import type { ModifierContext } from "./types";

describe("scale", () => {
	const context = {
		deltaTime: 0.016,
		handle: 0 as InputHandle,
	} satisfies ModifierContext;

	it("should scale a number by factor", () => {
		expect.assertions(1);

		expect(scale(2).modify(5, context)).toBe(10);
	});

	it("should scale a Vector2 by factor", () => {
		expect.assertions(2);

		const result = scale(3).modify(new Vector2(1, 2), context);

		expect(result.X).toBe(3);
		expect(result.Y).toBe(6);
	});

	it("should scale a Vector3 by factor", () => {
		expect.assertions(3);

		const result = scale(2).modify(new Vector3(1, 2, 3), context);

		expect(result.X).toBe(2);
		expect(result.Y).toBe(4);
		expect(result.Z).toBe(6);
	});

	it("should return zero when factor is 0", () => {
		expect.assertions(1);

		expect(scale(0).modify(42, context)).toBe(0);
	});

	it("should return original value when factor is 1", () => {
		expect.assertions(1);

		expect(scale(1).modify(7, context)).toBe(7);
	});
});
