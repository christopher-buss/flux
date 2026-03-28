import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { bool, defineActions, direction2d } from "../actions/define";
import { defineContexts } from "../contexts/define";
import type { BindingState } from "../types/bindings";
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
const INVALID = "nonexistent";

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

	describe("register", () => {
		it("should return InputHandle", () => {
			expectTypeOf(core.register("gameplay")).toEqualTypeOf<InputHandle>();
		});

		it("should accept variadic context names", () => {
			expectTypeOf<typeof core.register>().toBeCallableWith("gameplay", "ui");
		});

		it("should reject invalid context on register", () => {
			// @ts-expect-error unknown context
			core.register(INVALID);
		});
	});

	describe("addContext", () => {
		it("should constrain to known context names", () => {
			const handle = {} as InputHandle;
			expectTypeOf<typeof core.addContext>().toBeCallableWith(handle, "ui");
		});

		it("should reject invalid context on addContext", () => {
			const handle = {} as InputHandle;
			// @ts-expect-error unknown context
			core.addContext(handle, INVALID);
		});
	});

	describe("removeContext", () => {
		it("should reject invalid context on removeContext", () => {
			const handle = {} as InputHandle;
			// @ts-expect-error unknown context
			core.removeContext(handle, INVALID);
		});
	});

	describe("hasContext", () => {
		it("should return boolean", () => {
			const handle = {} as InputHandle;
			expectTypeOf(core.hasContext(handle, "gameplay")).toEqualTypeOf<boolean>();
		});

		it("should reject invalid context on hasContext", () => {
			const handle = {} as InputHandle;
			// @ts-expect-error unknown context
			core.hasContext(handle, INVALID);
		});
	});

	describe("getState", () => {
		it("should return typed ActionState", () => {
			const handle = {} as InputHandle;
			expectTypeOf(core.getState(handle)).toEqualTypeOf<ActionState<typeof actions>>();
		});
	});

	describe("getContexts", () => {
		it("should return typed context array", () => {
			const handle = {} as InputHandle;
			expectTypeOf(core.getContexts(handle)).toEqualTypeOf<
				ReadonlyArray<"gameplay" | "ui">
			>();
		});
	});

	describe("simulateAction", () => {
		it("should accept valid action names and matching values", () => {
			const handle = {} as InputHandle;
			expectTypeOf<typeof core.simulateAction<"jump">>().toBeCallableWith(
				handle,
				"jump",
				true,
			);
			expectTypeOf<typeof core.simulateAction<"move">>().toBeCallableWith(
				handle,
				"move",
				Vector2.zero,
			);
		});

		it("should reject invalid action on simulateAction", () => {
			const handle = {} as InputHandle;
			// @ts-expect-error unknown action
			core.simulateAction(handle, INVALID, true);
		});

		it("should reject wrong value type for action", () => {
			const handle = {} as InputHandle;
			// @ts-expect-error number is not valid for Bool action
			core.simulateAction(handle, "jump", 42);
		});
	});

	describe("unregister", () => {
		it("should accept InputHandle and return void", () => {
			expectTypeOf<typeof core.unregister>().returns.toEqualTypeOf<void>();
		});
	});

	describe("destroy", () => {
		it("should return void", () => {
			expectTypeOf<typeof core.destroy>().returns.toEqualTypeOf<void>();
		});
	});

	describe("update", () => {
		it("should accept number and return void", () => {
			expectTypeOf<typeof core.update>().parameter(0).toEqualTypeOf<number>();
			expectTypeOf<typeof core.update>().returns.toEqualTypeOf<void>();
		});
	});

	describe("rebind", () => {
		it("should constrain action to AllActions", () => {
			const handle = {} as InputHandle;
			expectTypeOf<typeof core.rebind>().toBeCallableWith(handle, "jump", []);
		});

		it("should reject invalid action on rebind", () => {
			const handle = {} as InputHandle;
			// @ts-expect-error unknown action
			core.rebind(handle, INVALID, []);
		});
	});

	describe("rebindAll", () => {
		it("should accept typed BindingState", () => {
			const handle = {} as InputHandle;
			const bindings: BindingState<typeof actions> = {};
			expectTypeOf<typeof core.rebindAll>().toBeCallableWith(handle, bindings);
		});
	});

	describe("resetBindings", () => {
		it("should constrain action to AllActions", () => {
			const handle = {} as InputHandle;
			expectTypeOf<typeof core.resetBindings>().toBeCallableWith(handle, "move");
		});

		it("should reject invalid action on resetBindings", () => {
			const handle = {} as InputHandle;
			// @ts-expect-error unknown action
			core.resetBindings(handle, INVALID);
		});
	});

	describe("resetAllBindings", () => {
		it("should return void", () => {
			expectTypeOf<typeof core.resetAllBindings>().returns.toEqualTypeOf<void>();
		});
	});

	describe("loadBindings", () => {
		it("should accept typed BindingState", () => {
			const handle = {} as InputHandle;
			const bindings: BindingState<typeof actions> = {};
			expectTypeOf<typeof core.loadBindings>().toBeCallableWith(handle, bindings);
		});
	});

	describe("serializeBindings", () => {
		it("should return typed BindingState", () => {
			const handle = {} as InputHandle;
			expectTypeOf(core.serializeBindings(handle)).toEqualTypeOf<
				BindingState<typeof actions>
			>();
		});
	});
});
