import type { AllActions, InputHandle } from "@rbxts/flux";
import { bool, createCore, defineActions, defineContexts, direction2d } from "@rbxts/flux";
import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { createFluxReact } from "../create-flux-react";
import type {
	FluxInputContextInfo,
	FluxUseActiveContext,
	FluxUseInputContext,
} from "./use-input-context";

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

describe("FluxInputContextInfo", () => {
	it("should have actions, isActive, priority, sink properties", () => {
		expectTypeOf<FluxInputContextInfo<typeof actions>>().toHaveProperty("actions");
		expectTypeOf<FluxInputContextInfo<typeof actions>>().toHaveProperty("isActive");
		expectTypeOf<FluxInputContextInfo<typeof actions>>().toHaveProperty("priority");
		expectTypeOf<FluxInputContextInfo<typeof actions>>().toHaveProperty("sink");
	});

	it("should type actions as ReadonlyArray<AllActions<T>>", () => {
		expectTypeOf<FluxInputContextInfo<typeof actions>["actions"]>().toEqualTypeOf<
			ReadonlyArray<AllActions<typeof actions>>
		>();
	});

	it("should type isActive, priority, sink as primitives", () => {
		expectTypeOf<FluxInputContextInfo<typeof actions>["isActive"]>().toEqualTypeOf<boolean>();
		expectTypeOf<FluxInputContextInfo<typeof actions>["priority"]>().toEqualTypeOf<number>();
		expectTypeOf<FluxInputContextInfo<typeof actions>["sink"]>().toEqualTypeOf<boolean>();
	});
});

describe("FluxUseActiveContext", () => {
	const handle = {} as InputHandle;
	const useActiveContext = {} as FluxUseActiveContext<"gameplay" | "ui">;

	describe("single-arg overload", () => {
		it("should accept a valid context name and return boolean", () => {
			expectTypeOf(useActiveContext("gameplay")).toEqualTypeOf<boolean>();
			expectTypeOf(useActiveContext("ui")).toEqualTypeOf<boolean>();
		});

		it("should narrow context generic", () => {
			// @ts-expect-error "menu" is not in the Contexts union
			useActiveContext("menu");
		});
	});

	describe("two-arg overload", () => {
		it("should accept handle and valid context and return boolean", () => {
			expectTypeOf(useActiveContext(handle, "gameplay")).toEqualTypeOf<boolean>();
		});

		it("should narrow context generic with explicit handle", () => {
			// @ts-expect-error "menu" is not in the Contexts union
			useActiveContext(handle, "menu");
		});
	});

	describe("call signature", () => {
		it("should reject missing context", () => {
			// @ts-expect-error missing context argument
			useActiveContext();
		});
	});
});

describe("FluxUseInputContext", () => {
	const handle = {} as InputHandle;
	const useInputContext = {} as FluxUseInputContext<typeof actions, "gameplay" | "ui">;

	describe("single-arg overload", () => {
		it("should return FluxInputContextInfo<T>", () => {
			expectTypeOf(useInputContext("gameplay")).toEqualTypeOf<
				FluxInputContextInfo<typeof actions>
			>();
		});

		it("should narrow context generic", () => {
			// @ts-expect-error "menu" is not in the Contexts union
			useInputContext("menu");
		});
	});

	describe("two-arg overload", () => {
		it("should return FluxInputContextInfo<T> with explicit handle", () => {
			expectTypeOf(useInputContext(handle, "gameplay")).toEqualTypeOf<
				FluxInputContextInfo<typeof actions>
			>();
		});

		it("should narrow context generic with explicit handle", () => {
			// @ts-expect-error "menu" is not in the Contexts union
			useInputContext(handle, "menu");
		});
	});

	describe("call signature", () => {
		it("should reject missing context", () => {
			// @ts-expect-error missing context argument
			useInputContext();
		});
	});
});

describe("factory wiring", () => {
	it("should type flux.useActiveContext as FluxUseActiveContext<Contexts>", () => {
		expectTypeOf(flux.useActiveContext).toEqualTypeOf<FluxUseActiveContext<"gameplay">>();
	});

	it("should type flux.useInputContext as FluxUseInputContext<T, Contexts>", () => {
		expectTypeOf(flux.useInputContext).toEqualTypeOf<
			FluxUseInputContext<typeof actions, "gameplay">
		>();
	});

	it("should return FluxInputContextInfo shape from flux.useInputContext", () => {
		expectTypeOf(flux.useInputContext("gameplay")).toEqualTypeOf<
			FluxInputContextInfo<typeof actions>
		>();
	});

	it("should reject unknown context on flux.useInputContext", () => {
		// @ts-expect-error unknown context name
		flux.useInputContext("nonexistent");
	});

	it("should reject unknown context on flux.useActiveContext", () => {
		// @ts-expect-error unknown context name
		flux.useActiveContext("nonexistent");
	});
});
