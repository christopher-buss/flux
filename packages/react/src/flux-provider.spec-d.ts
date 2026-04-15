import type { InputHandle } from "@rbxts/flux";
import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";
import type React from "@rbxts/react";

import type { FluxProviderProps } from "./flux-provider";

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
