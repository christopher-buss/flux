import type { FluxCore, InputHandle } from "@rbxts/flux";
import { bool, createCore, defineActions, defineContexts, direction2d } from "@rbxts/flux";
import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { createFluxReact } from "../create-flux-react";
import type { FluxUseFluxCore } from "./use-flux-core";

const actions = defineActions({
	jump: bool(),
	move: direction2d(),
});

const contexts = defineContexts({
	gameplay: { bindings: {}, priority: 0 },
	menu: { bindings: {}, priority: 1 },
});

// eslint-disable-next-line unused-imports/no-unused-vars -- keeps runtime imports active
const core = createCore({ actions, contexts });
const flux = createFluxReact<typeof actions, keyof typeof contexts>();

describe("FluxUseFluxCore", () => {
	it("should type the hook return as FluxCore<T, Contexts>", () => {
		expectTypeOf(flux.useFluxCore).toEqualTypeOf<
			FluxUseFluxCore<typeof actions, "gameplay" | "menu">
		>();
	});

	it("should return FluxCore narrowed to the factory generics", () => {
		expectTypeOf(flux.useFluxCore()).toEqualTypeOf<
			FluxCore<typeof actions, "gameplay" | "menu">
		>();
	});

	it("should reject unknown context names on addContext", () => {
		const fluxCore = flux.useFluxCore();
		const handle = {} as InputHandle;

		// valid — "gameplay" is in the Contexts union
		fluxCore.addContext(handle, "gameplay");

		// @ts-expect-error "combat" is not in the Contexts union
		fluxCore.addContext(handle, "combat");
	});
});
