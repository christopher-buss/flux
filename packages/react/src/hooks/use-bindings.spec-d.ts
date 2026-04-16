import type { BindingLike, InputHandle, InputPlatform } from "@rbxts/flux";
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

describe("FluxUseBindings", () => {
	const handle = {} as InputHandle;

	describe("single-arg overload", () => {
		it("should accept action names from the action map", () => {
			expectTypeOf(flux.useBindings("jump")).toEqualTypeOf<ReadonlyArray<BindingLike>>();
			expectTypeOf(flux.useBindings("move")).toEqualTypeOf<ReadonlyArray<BindingLike>>();
		});

		it("should accept optional InputPlatform", () => {
			const platform: InputPlatform = "keyboard";
			expectTypeOf(flux.useBindings("jump", platform)).toEqualTypeOf<
				ReadonlyArray<BindingLike>
			>();
		});

		it("should return ReadonlyArray<BindingLike>", () => {
			expectTypeOf(flux.useBindings("jump")).toEqualTypeOf<ReadonlyArray<BindingLike>>();
		});
	});

	describe("handle-override overload", () => {
		it("should accept InputHandle as first argument", () => {
			expectTypeOf(flux.useBindings(handle, "jump")).toEqualTypeOf<
				ReadonlyArray<BindingLike>
			>();
		});

		it("should accept optional InputPlatform with handle", () => {
			expectTypeOf(flux.useBindings(handle, "jump", "gamepad")).toEqualTypeOf<
				ReadonlyArray<BindingLike>
			>();
		});
	});

	describe("call signature", () => {
		it("should reject missing action", () => {
			// @ts-expect-error missing action argument
			flux.useBindings();
		});
	});
});
