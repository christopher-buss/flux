import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { bool, defineActions, direction1d, direction2d } from "../actions/define";
import type { ActionState } from "../types/state";
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
