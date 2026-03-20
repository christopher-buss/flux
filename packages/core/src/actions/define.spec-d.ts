import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import type {
	ActionConfig,
	AllActions,
	AxisActions,
	BoolActions,
	Direction1dActions,
	Direction2dActions,
	Direction3dActions,
	ViewportPositionActions,
} from "../types/actions";
import {
	action,
	bool,
	defineActions,
	direction1d,
	direction2d,
	direction3d,
	position2d,
} from "./define";

const actions = defineActions({
	aim: position2d(),
	climb: direction1d(),
	fly: direction3d(),
	jump: action({ type: "Bool" }),
	move: action({ type: "Direction2D" }),
});

describe("defineActions", () => {
	it("should preserve literal type on ActionConfig", () => {
		expectTypeOf(actions.jump).toEqualTypeOf<ActionConfig<"Bool">>();
		expectTypeOf(actions.move).toEqualTypeOf<ActionConfig<"Direction2D">>();
		expectTypeOf(actions.climb).toEqualTypeOf<ActionConfig<"Direction1D">>();
		expectTypeOf(actions.fly).toEqualTypeOf<ActionConfig<"Direction3D">>();
		expectTypeOf(actions.aim).toEqualTypeOf<ActionConfig<"ViewportPosition">>();
	});
});

describe("convenience wrappers", () => {
	it("should produce correct ActionConfig types", () => {
		expectTypeOf(bool()).toEqualTypeOf<ActionConfig<"Bool">>();
		expectTypeOf(direction1d()).toEqualTypeOf<ActionConfig<"Direction1D">>();
		expectTypeOf(direction2d()).toEqualTypeOf<ActionConfig<"Direction2D">>();
		expectTypeOf(direction3d()).toEqualTypeOf<ActionConfig<"Direction3D">>();
		expectTypeOf(position2d()).toEqualTypeOf<ActionConfig<"ViewportPosition">>();
	});
});

describe("type extractors", () => {
	it("should extract BoolActions", () => {
		expectTypeOf<BoolActions<typeof actions>>().toEqualTypeOf<"jump">();
	});

	it("should extract Direction1dActions", () => {
		expectTypeOf<Direction1dActions<typeof actions>>().toEqualTypeOf<"climb">();
	});

	it("should extract Direction2dActions", () => {
		expectTypeOf<Direction2dActions<typeof actions>>().toEqualTypeOf<"move">();
	});

	it("should extract Direction3dActions", () => {
		expectTypeOf<Direction3dActions<typeof actions>>().toEqualTypeOf<"fly">();
	});

	it("should extract ViewportPositionActions", () => {
		expectTypeOf<ViewportPositionActions<typeof actions>>().toEqualTypeOf<"aim">();
	});

	it("should extract AxisActions as union of direction types", () => {
		expectTypeOf<AxisActions<typeof actions>>().toEqualTypeOf<"climb" | "fly" | "move">();
	});

	it("should extract AllActions as union of all action names", () => {
		expectTypeOf<AllActions<typeof actions>>().toEqualTypeOf<
			"aim" | "climb" | "fly" | "jump" | "move"
		>();
	});
});
