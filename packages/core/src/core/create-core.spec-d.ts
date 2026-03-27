import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { bool, defineActions, direction2d } from "../actions/define";
import { defineContexts } from "../contexts/define";
import type { FluxCore, InputHandle } from "../types/core";
import type { ActionState } from "../types/state";
import type { CreateCoreOptions } from "./create-core";
import { createCore } from "./create-core";

const actions = defineActions({
	jump: bool(),
	move: direction2d(),
});

const contexts = defineContexts({
	gameplay: { bindings: {}, priority: 0 },
	ui: { bindings: {}, priority: 10, sink: true },
});

const core = createCore({ actions, contexts });

describe("CreateCoreOptions", () => {
	it("should require actions and contexts fields", () => {
		expectTypeOf<CreateCoreOptions<typeof actions, typeof contexts>>().toHaveProperty(
			"actions",
		);
		expectTypeOf<CreateCoreOptions<typeof actions, typeof contexts>>().toHaveProperty(
			"contexts",
		);
	});

	it("should reject missing fields", () => {
		// @ts-expect-error missing contexts
		createCore({ actions });
		// @ts-expect-error missing actions
		createCore({ contexts });
	});
});

describe("createCore", () => {
	it("should return FluxCore typed with actions and context names", () => {
		expectTypeOf(core).toEqualTypeOf<FluxCore<typeof actions, "gameplay" | "ui">>();
	});

	it("should constrain register to known context names", () => {
		expectTypeOf<typeof core.register>().toBeCallableWith("gameplay" as "gameplay" | "ui");
	});

	it("should constrain addContext to known context names", () => {
		const handle = {} as InputHandle;
		expectTypeOf<typeof core.addContext>().toBeCallableWith(handle, "ui");
	});

	it("should return typed ActionState from getState", () => {
		const handle = {} as InputHandle;
		expectTypeOf(core.getState(handle)).toEqualTypeOf<ActionState<typeof actions>>();
	});

	it("should return typed context array from getContexts", () => {
		const handle = {} as InputHandle;
		expectTypeOf(core.getContexts(handle)).toEqualTypeOf<ReadonlyArray<"gameplay" | "ui">>();
	});

	it("should constrain simulateAction to valid action names and values", () => {
		const handle = {} as InputHandle;
		expectTypeOf<typeof core.simulateAction<"jump">>().toBeCallableWith(handle, "jump", true);
		expectTypeOf<typeof core.simulateAction<"move">>().toBeCallableWith(
			handle,
			"move",
			Vector2.zero,
		);
	});
});
