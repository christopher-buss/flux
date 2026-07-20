import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { bool, defineActions, direction1d, direction2d } from "../actions/define";
import type { ActionState, CaptureToken } from "../types/state";
import type { InternalActionState, UpdateActionOptions } from "./action-state";
import { createActionState } from "./action-state";

const actions = defineActions({
	jump: bool(),
	move: direction2d(),
	throttle: direction1d(),
});

describe("createActionState", () => {
	it("should return a tuple of [ActionState, InternalActionState]", () => {
		const result = createActionState(actions);
		expectTypeOf(result).toEqualTypeOf<[ActionState<typeof actions>, InternalActionState]>();
	});

	it("should return typed ActionState as the first element", () => {
		const [publicState] = createActionState(actions);
		expectTypeOf(publicState).toEqualTypeOf<ActionState<typeof actions>>();
	});

	it("should return InternalActionState as the second element", () => {
		const [, internalState] = createActionState(actions);
		expectTypeOf(internalState).toEqualTypeOf<InternalActionState>();
	});
});

describe("capture", () => {
	type JumpToken = CaptureToken<typeof actions, "jump">;
	type MoveToken = CaptureToken<typeof actions, "move">;
	type ThrottleToken = CaptureToken<typeof actions, "throttle">;

	it("should return a token typed by the captured action", () => {
		const [state] = createActionState(actions);
		expectTypeOf(state.capture("jump")).toEqualTypeOf<JumpToken>();
	});

	it("should expose Bool reads on a Bool token", () => {
		expectTypeOf<JumpToken["pressed"]>().toEqualTypeOf<() => boolean>();
		expectTypeOf<JumpToken["justPressed"]>().toEqualTypeOf<() => boolean>();
		expectTypeOf<JumpToken["justReleased"]>().toEqualTypeOf<() => boolean>();
		expectTypeOf<JumpToken["getState"]>().toEqualTypeOf<() => boolean>();
	});

	it("should reject axis reads on a Bool token", () => {
		expectTypeOf<JumpToken>().not.toHaveProperty("axis1d");
		expectTypeOf<JumpToken>().not.toHaveProperty("axis3d");
		expectTypeOf<JumpToken>().not.toHaveProperty("axisBecameActive");
		expectTypeOf<JumpToken>().not.toHaveProperty("axisBecameInactive");
		expectTypeOf<JumpToken>().not.toHaveProperty("direction2d");
		expectTypeOf<JumpToken>().not.toHaveProperty("position2d");
	});

	it("should expose axis reads on a Direction2D token", () => {
		expectTypeOf<MoveToken["direction2d"]>().toEqualTypeOf<() => Vector2>();
		expectTypeOf<MoveToken["axisBecameActive"]>().toEqualTypeOf<() => boolean>();
		expectTypeOf<MoveToken["axisBecameInactive"]>().toEqualTypeOf<() => boolean>();
		expectTypeOf<MoveToken["getState"]>().toEqualTypeOf<() => Vector2>();
	});

	it("should reject Bool reads on a Direction2D token", () => {
		expectTypeOf<MoveToken>().not.toHaveProperty("pressed");
		expectTypeOf<MoveToken>().not.toHaveProperty("justPressed");
		expectTypeOf<MoveToken>().not.toHaveProperty("justReleased");
	});

	it("should expose axis1d on a Direction1D token", () => {
		expectTypeOf<ThrottleToken["axis1d"]>().toEqualTypeOf<() => number>();
	});

	it("should expose claim and release on every token", () => {
		expectTypeOf<JumpToken["claim"]>().toEqualTypeOf<() => boolean>();
		expectTypeOf<JumpToken["release"]>().toEqualTypeOf<() => void>();
	});

	it("should expose no raw reads on the token", () => {
		expectTypeOf<JumpToken>().not.toHaveProperty("rawPressed");
		expectTypeOf<JumpToken>().not.toHaveProperty("rawJustPressed");
	});

	it("should expose no introspection members on the token", () => {
		expectTypeOf<JumpToken>().not.toHaveProperty("isActive");
		expectTypeOf<JumpToken>().not.toHaveProperty("isClaimed");
		expectTypeOf<JumpToken>().not.toHaveProperty("isEnabled");
		expectTypeOf<JumpToken>().not.toHaveProperty("isAvailable");
	});

	it("should accept an options bag", () => {
		expectTypeOf<ActionState<typeof actions>["capture"]>().toBeCallableWith("jump", {});
	});
});

describe("InternalActionState", () => {
	it("should have endFrame method returning void", () => {
		expectTypeOf<InternalActionState["endFrame"]>().toEqualTypeOf<() => void>();
	});

	it("should have setEnabled accepting string and boolean", () => {
		expectTypeOf<InternalActionState["setEnabled"]>().toBeCallableWith("jump", true);
	});

	it("should have updateAction accepting UpdateActionOptions", () => {
		const options: UpdateActionOptions = {
			action: "jump",
			deltaTime: 0.016,
			triggerState: "triggered",
			value: true,
		};
		expectTypeOf<InternalActionState["updateAction"]>().toBeCallableWith(options);
	});
});

describe("UpdateActionOptions", () => {
	it("should have required fields with correct types", () => {
		expectTypeOf<UpdateActionOptions>().toHaveProperty("action");
		expectTypeOf<UpdateActionOptions>().toHaveProperty("deltaTime");
		expectTypeOf<UpdateActionOptions>().toHaveProperty("triggerState");
		expectTypeOf<UpdateActionOptions>().toHaveProperty("value");
	});

	it("should constrain triggerState to TriggerState", () => {
		expectTypeOf<UpdateActionOptions["triggerState"]>().toEqualTypeOf<
			"canceled" | "none" | "ongoing" | "triggered"
		>();
	});
});
