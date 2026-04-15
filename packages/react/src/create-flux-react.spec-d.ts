import type { ActionState, BindingLike, FluxCore, InputHandle, InputPlatform } from "@rbxts/flux";
import { bool, createCore, defineActions, defineContexts, direction2d } from "@rbxts/flux";
import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";
import type React from "@rbxts/react";

import { createFluxReact } from "./create-flux-react";
import type { FluxReact, FluxReactWrapOptions } from "./create-flux-react";
import type { FluxProviderProps } from "./flux-provider";
import type { FluxUseAction } from "./use-action";
import type { FluxUseBindings } from "./use-bindings";

const actions = defineActions({
	jump: bool(),
	move: direction2d(),
});

const contexts = defineContexts({
	gameplay: { bindings: {}, priority: 0 },
});

const core = createCore({ actions, contexts });
const flux = createFluxReact({ core });
const INVALID = "nonexistent";

describe("FluxReactWrapOptions", () => {
	it("should require core field", () => {
		expectTypeOf<FluxReactWrapOptions<typeof actions>>().toHaveProperty("core");
	});

	it("should type core as FluxCore<T>", () => {
		expectTypeOf<FluxReactWrapOptions<typeof actions>["core"]>().toEqualTypeOf<
			FluxCore<typeof actions>
		>();
	});

	it("should not have extra fields", () => {
		expectTypeOf<FluxReactWrapOptions<typeof actions>>().not.toHaveProperty("debug");
		expectTypeOf<FluxReactWrapOptions<typeof actions>>().not.toHaveProperty("parent");
	});

	it("should reject missing core", () => {
		// @ts-expect-error missing core
		createFluxReact({});
	});
});

describe("createFluxReact", () => {
	it("should return FluxReact typed with actions and contexts", () => {
		expectTypeOf(flux).toEqualTypeOf<FluxReact<typeof actions, "gameplay">>();
	});

	it("should infer T and Contexts from options.core", () => {
		expectTypeOf(flux.core).toEqualTypeOf<FluxCore<typeof actions, "gameplay">>();
	});

	it("should not bleed action types across instances", () => {
		const otherActions = defineActions({
			shoot: bool(),
		});
		const otherCore = createCore({
			actions: otherActions,
			contexts: defineContexts({
				combat: { bindings: {}, priority: 0 },
			}),
		});
		const otherFlux = createFluxReact({ core: otherCore });

		otherFlux.useAction((state) => state.pressed("shoot"));

		// @ts-expect-error unknown action on other instance
		otherFlux.useAction((state) => state.pressed("jump"));
	});
});

describe("FluxReact", () => {
	it("should have core, flush, FluxProvider, useAction, and useBindings properties", () => {
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("core");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("flush");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("FluxProvider");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("useAction");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("useBindings");
	});

	it("should type core as FluxCore<T, Contexts>", () => {
		expectTypeOf(flux.core).toEqualTypeOf<FluxCore<typeof actions, "gameplay">>();
	});

	it("should type flush as () => void", () => {
		expectTypeOf(flux.flush).toEqualTypeOf<() => void>();
	});

	it("should type FluxProvider as callable with FluxProviderProps", () => {
		expectTypeOf<typeof flux.FluxProvider>().toBeCallableWith({
			handle: {} as InputHandle,
		});
	});

	it("should type FluxProvider return as React.ReactNode", () => {
		expectTypeOf<typeof flux.FluxProvider>().returns.toEqualTypeOf<React.ReactNode>();
	});

	it("should type useAction as FluxUseAction<T>", () => {
		expectTypeOf(flux.useAction).toEqualTypeOf<FluxUseAction<typeof actions>>();
	});

	it("should type useBindings as FluxUseBindings<T>", () => {
		expectTypeOf(flux.useBindings).toEqualTypeOf<FluxUseBindings<typeof actions>>();
	});
});

describe("FluxProviderProps", () => {
	it("should have handle and children properties", () => {
		expectTypeOf<FluxProviderProps>().toHaveProperty("handle");
		expectTypeOf<FluxProviderProps>().toHaveProperty("children");
	});

	it("should type handle as InputHandle", () => {
		expectTypeOf<FluxProviderProps["handle"]>().toEqualTypeOf<InputHandle>();
	});

	it("should type children as optional React.ReactNode", () => {
		expectTypeOf<FluxProviderProps["children"]>().toEqualTypeOf<React.ReactNode | undefined>();
	});

	it("should reject missing handle", () => {
		// @ts-expect-error missing handle
		const _props: FluxProviderProps = {};
	});

	it("should reject wrong handle type", () => {
		// @ts-expect-error handle must be InputHandle
		const _props: FluxProviderProps = { handle: 42 };
	});
});

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
