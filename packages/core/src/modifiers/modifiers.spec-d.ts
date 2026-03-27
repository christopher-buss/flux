import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import type { InputHandle } from "../types/core";
import { deadZone } from "./dead-zone";
import { negate } from "./negate";
import { scale } from "./scale";
import type { Modifier, ModifierContext, ModifierValue } from "./types";

describe("deadZone", () => {
	it("should accept a number and return a Modifier", () => {
		expectTypeOf(deadZone).parameter(0).toEqualTypeOf<number>();
		expectTypeOf(deadZone).returns.toEqualTypeOf<Modifier>();
	});

	it("should reject non-number arguments", () => {
		// @ts-expect-error string is not a valid threshold
		deadZone("0.5");
	});
});

describe("negate", () => {
	it("should accept no arguments and return a Modifier", () => {
		expectTypeOf(negate).toBeCallableWith();
		expectTypeOf(negate).returns.toEqualTypeOf<Modifier>();
	});
});

describe("scale", () => {
	it("should accept a number and return a Modifier", () => {
		expectTypeOf(scale).parameter(0).toEqualTypeOf<number>();
		expectTypeOf(scale).returns.toEqualTypeOf<Modifier>();
	});

	it("should reject non-number arguments", () => {
		// @ts-expect-error string is not a valid factor
		scale("2");
	});
});

describe("Modifier", () => {
	it("should have overloaded modify accepting number, Vector2, Vector3", () => {
		const modifier = deadZone(0.1);
		const context: ModifierContext = { deltaTime: 0.016, handle: {} as InputHandle };

		expectTypeOf(modifier.modify(0.5, context)).toBeNumber();
		expectTypeOf(modifier.modify(Vector2.zero, context)).toEqualTypeOf<Vector2>();
		expectTypeOf(modifier.modify(Vector3.zero, context)).toEqualTypeOf<Vector3>();
	});

	it("should reject boolean values", () => {
		const modifier = negate();
		const context: ModifierContext = { deltaTime: 0.016, handle: {} as InputHandle };

		// @ts-expect-error boolean is not a valid ModifierValue
		modifier.modify(true, context);
	});
});

describe("ModifierContext", () => {
	it("should have deltaTime and handle fields", () => {
		expectTypeOf<ModifierContext>().toHaveProperty("deltaTime");
		expectTypeOf<ModifierContext>().toHaveProperty("handle");
	});

	it("should type deltaTime as number", () => {
		expectTypeOf<ModifierContext["deltaTime"]>().toEqualTypeOf<number>();
	});

	it("should type handle as InputHandle", () => {
		expectTypeOf<ModifierContext["handle"]>().toEqualTypeOf<InputHandle>();
	});
});

describe("ModifierValue", () => {
	it("should be a union of number, Vector2, and Vector3", () => {
		expectTypeOf<ModifierValue>().toEqualTypeOf<number | Vector2 | Vector3>();
	});
});
