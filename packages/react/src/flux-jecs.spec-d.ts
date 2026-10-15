import type { InputHandle } from "@rbxts/flux";
import { bool, defineActions, defineContexts, direction2d } from "@rbxts/flux";
import type { FluxJecs } from "@rbxts/flux-jecs";
import type { Entity } from "@rbxts/jecs";
import { describe, it } from "@rbxts/jest-globals";
import { fromAny, fromPartial } from "@rbxts/jest-utils";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { createFluxReact } from "./create-flux-react";
import type { FluxProviderProps } from "./flux-provider";
import type { FluxSourceHandle } from "./flux-source";

// eslint-disable-next-line unused-imports/no-unused-vars -- used as type below
const actions = defineActions({
	jump: bool(),
	move: direction2d(),
});

// eslint-disable-next-line unused-imports/no-unused-vars -- used as type below
const contexts = defineContexts({
	gameplay: { bindings: {}, priority: 0 },
	menu: { bindings: {}, priority: 1 },
});

type Actions = typeof actions;
type Contexts = keyof typeof contexts;
type Source = FluxJecs<Actions, typeof contexts>;

const flux = createFluxReact<Actions, Contexts, Source>();
const entity = fromPartial<Entity>(fromAny(1));
const handle = fromPartial<InputHandle>(fromAny(1));

describe("createFluxReact with a FluxJecs source", () => {
	it("should derive Entity as the handle type", () => {
		expectTypeOf<FluxSourceHandle<Source>>().toEqualTypeOf<Entity>();
	});

	it("should type the Provider with the wrapper and an Entity", () => {
		expectTypeOf<
			FluxProviderProps<Actions, Contexts, Source>["core"]
		>().toEqualTypeOf<Source>();
		expectTypeOf<
			FluxProviderProps<Actions, Contexts, Source>["handle"]
		>().toEqualTypeOf<Entity>();
	});

	it("should reject an InputHandle on the Provider", () => {
		const _props: FluxProviderProps<Actions, Contexts, Source> = {
			core: fromAny({}),
			// @ts-expect-error handle must be an Entity
			handle,
		};
	});

	it("should return the wrapper from useFluxCore", () => {
		expectTypeOf(flux.useFluxCore()).toEqualTypeOf<Source>();
	});

	it("should return the Entity from useFluxHandle", () => {
		expectTypeOf(flux.useFluxHandle()).toEqualTypeOf<Entity>();
	});

	it("should accept an Entity as the explicit hook handle", () => {
		flux.useAction(entity, (state) => state.pressed("jump"));
		flux.useBindings(entity, "jump");
		flux.useActiveContext(entity, "menu");
		flux.useInputContext(entity, "menu");
		flux.useCapture(entity, "jump");
	});

	it("should reject an InputHandle as the explicit hook handle", () => {
		// @ts-expect-error handle must be an Entity
		flux.useAction(handle, (state) => state.pressed("jump"));
		// @ts-expect-error handle must be an Entity
		flux.useActiveContext(handle, "menu");
	});

	it("should reject a source over different actions", () => {
		// @ts-expect-error source actions must match the factory's
		createFluxReact<Actions, Contexts, FluxJecs<{ other: ReturnType<typeof bool> }>>();
	});
});

describe("createFluxReact with the default source", () => {
	it("should keep InputHandle as the handle type", () => {
		const coreFlux = createFluxReact<Actions, Contexts>();

		expectTypeOf(coreFlux.useFluxHandle()).toEqualTypeOf<InputHandle>();

		// @ts-expect-error handle must be an InputHandle
		coreFlux.useAction(entity, (state) => state.pressed("jump"));
	});
});
