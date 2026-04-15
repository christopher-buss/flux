import type { FluxCore, InputHandle } from "@rbxts/flux";
import { bool, createCore, defineActions, defineContexts, direction2d } from "@rbxts/flux";
import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";
import type React from "@rbxts/react";

import { createFluxReact } from "./create-flux-react";
import type { FluxReact, FluxReactWrapOptions } from "./create-flux-react";
import type { FluxUseAction } from "./use-action";
import type { FluxUseBindings } from "./use-bindings";
import type { FluxUseActiveContext, FluxUseInputContext } from "./use-input-context";

const actions = defineActions({
	jump: bool(),
	move: direction2d(),
});

const contexts = defineContexts({
	gameplay: { bindings: {}, priority: 0 },
});

const core = createCore({ actions, contexts });
const flux = createFluxReact({ core });

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
	it("should have core, flush, and FluxProvider properties", () => {
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("core");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("flush");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("FluxProvider");
	});

	it("should have useAction, useBindings, useActiveContext, useInputContext", () => {
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("useAction");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("useBindings");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("useActiveContext");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("useInputContext");
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

	it("should type useActiveContext as FluxUseActiveContext<Contexts>", () => {
		expectTypeOf(flux.useActiveContext).toEqualTypeOf<FluxUseActiveContext<"gameplay">>();
	});

	it("should type useInputContext as FluxUseInputContext<T, Contexts>", () => {
		expectTypeOf(flux.useInputContext).toEqualTypeOf<
			FluxUseInputContext<typeof actions, "gameplay">
		>();
	});
});
