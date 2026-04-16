import type { FluxCore, InputHandle } from "@rbxts/flux";
import { bool, createCore, defineActions, defineContexts, direction2d } from "@rbxts/flux";
import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";
import type React from "@rbxts/react";

import { createFluxReact } from "./create-flux-react";
import type { FluxReact } from "./create-flux-react";
import type { FluxUseAction } from "./hooks/use-action";
import type { FluxUseBindings } from "./hooks/use-bindings";
import type { FluxUseActiveContext, FluxUseInputContext } from "./hooks/use-input-context";

const actions = defineActions({
	jump: bool(),
	move: direction2d(),
});

const contexts = defineContexts({
	gameplay: { bindings: {}, priority: 0 },
});

type Contexts = keyof typeof contexts;

// Runtime handle for the FluxCore binding below keeps `defineActions` /
// `defineContexts` live.
const runtimeCore = createCore({ actions, contexts });
const flux = createFluxReact<typeof actions, Contexts>();

describe("createFluxReact", () => {
	it("should return FluxReact typed with actions and contexts", () => {
		expectTypeOf(flux).toEqualTypeOf<FluxReact<typeof actions, "gameplay">>();
	});

	it("should accept a core of the matching generic on FluxProvider", () => {
		expectTypeOf<typeof flux.FluxProvider>().parameter(0).toExtend<{
			core: FluxCore<typeof actions, "gameplay">;
		}>();
	});

	it("should not bleed action types across instances", () => {
		// eslint-disable-next-line unused-imports/no-unused-vars -- runtime value pins inference below
		const otherActions = defineActions({
			shoot: bool(),
		});
		const otherFlux = createFluxReact<typeof otherActions, "combat">();

		otherFlux.useAction((state) => state.pressed("shoot"));

		// @ts-expect-error unknown action on other instance
		otherFlux.useAction((state) => state.pressed("jump"));
	});

	it("should keep runtimeCore compatible with the factory Provider", () => {
		expectTypeOf(runtimeCore).toExtend<FluxCore<typeof actions, "gameplay">>();
	});
});

describe("FluxReact", () => {
	it("should have flush and FluxProvider properties", () => {
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("flush");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("FluxProvider");
	});

	it("should not expose core on the factory return", () => {
		expectTypeOf<FluxReact<typeof actions>>().not.toHaveProperty("core");
	});

	it("should have useAction, useBindings, useActiveContext, useInputContext", () => {
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("useAction");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("useBindings");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("useActiveContext");
		expectTypeOf<FluxReact<typeof actions>>().toHaveProperty("useInputContext");
	});

	it("should type flush as () => void", () => {
		expectTypeOf(flux.flush).toEqualTypeOf<() => void>();
	});

	it("should type FluxProvider as callable with core and handle", () => {
		expectTypeOf<typeof flux.FluxProvider>().toBeCallableWith({
			core: runtimeCore,
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
