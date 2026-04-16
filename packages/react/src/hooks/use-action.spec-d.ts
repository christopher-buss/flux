import type { ActionState, InputHandle } from "@rbxts/flux";
import { bool, createCore, defineActions, defineContexts, direction2d } from "@rbxts/flux";
import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { createFluxReact } from "../create-flux-react";

const actions = defineActions({
	jump: bool(),
	move: direction2d(),
});

const contexts = defineContexts({
	gameplay: { bindings: {}, priority: 0 },
});

// eslint-disable-next-line unused-imports/no-unused-vars -- keeps runtime imports active
const core = createCore({ actions, contexts });
const flux = createFluxReact<typeof actions, keyof typeof contexts>();
const INVALID = "nonexistent";

describe("FluxUseAction", () => {
	const handle = {} as InputHandle;

	describe("single-arg overload", () => {
		it("should return concrete type from selector", () => {
			expectTypeOf(flux.useAction((state) => state.pressed("jump"))).toEqualTypeOf<boolean>();
			expectTypeOf(
				flux.useAction((state) => state.direction2d("move")),
			).toEqualTypeOf<Vector2>();
		});

		it("should return full ActionState when selector is identity", () => {
			expectTypeOf(flux.useAction((state) => state)).toEqualTypeOf<
				ActionState<typeof actions>
			>();
		});

		it("should constrain selector state to typed ActionState", () => {
			// @ts-expect-error unknown action
			flux.useAction((state) => state.pressed(INVALID));
		});

		it("should reject wrong action type for query method", () => {
			// @ts-expect-error jump is a Bool action, not Direction2D
			flux.useAction((state) => state.direction2d("jump"));
		});
	});

	describe("two-arg overload", () => {
		it("should return concrete type from selector with explicit handle", () => {
			expectTypeOf(
				flux.useAction(handle, (state) => state.pressed("jump")),
			).toEqualTypeOf<boolean>();
			expectTypeOf(
				flux.useAction(handle, (state) => state.direction2d("move")),
			).toEqualTypeOf<Vector2>();
		});

		it("should reject non-handle first argument", () => {
			// @ts-expect-error string is not an InputHandle
			flux.useAction("not-a-handle", (state) => state.pressed("jump"));
		});
	});

	describe("call signature", () => {
		it("should reject missing selector", () => {
			// @ts-expect-error missing selector
			flux.useAction();
		});
	});
});
