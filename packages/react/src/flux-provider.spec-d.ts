import type { FluxCore, InputHandle } from "@rbxts/flux";
import { bool, defineActions } from "@rbxts/flux";
import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";
import type React from "@rbxts/react";

import type { FluxProviderProps } from "./flux-provider";

// eslint-disable-next-line unused-imports/no-unused-vars -- used as type below
const actions = defineActions({
	jump: bool(),
});

type Actions = typeof actions;
type Props = FluxProviderProps<Actions, "gameplay">;

describe("FluxProviderProps", () => {
	it("should have core, handle, and children properties", () => {
		expectTypeOf<Props>().toHaveProperty("core");
		expectTypeOf<Props>().toHaveProperty("handle");
		expectTypeOf<Props>().toHaveProperty("children");
	});

	it("should type core as FluxCore<T, Contexts>", () => {
		expectTypeOf<Props["core"]>().toEqualTypeOf<FluxCore<Actions, "gameplay">>();
	});

	it("should type handle as InputHandle", () => {
		expectTypeOf<Props["handle"]>().toEqualTypeOf<InputHandle>();
	});

	it("should type children as optional React.ReactNode", () => {
		expectTypeOf<Props["children"]>().toEqualTypeOf<React.ReactNode | undefined>();
	});

	it("should reject missing core", () => {
		// @ts-expect-error missing core
		const _props: Props = { handle: {} as InputHandle };
	});

	it("should reject missing handle", () => {
		// @ts-expect-error missing handle
		const _props: Props = { core: {} as FluxCore<Actions, "gameplay"> };
	});

	it("should reject wrong handle type", () => {
		const _props: Props = {
			core: {} as FluxCore<Actions, "gameplay">,
			// @ts-expect-error handle must be InputHandle
			handle: 42,
		};
	});
});
