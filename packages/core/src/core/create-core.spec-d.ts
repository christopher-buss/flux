import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { bool, defineActions, direction2d } from "../actions/define";
import { defineContexts } from "../contexts/define";
import type { BindingLike } from "../types/bindings";
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

	it("should not have parent field", () => {
		expectTypeOf<CreateCoreOptions<typeof actions, typeof contexts>>().not.toHaveProperty(
			"parent",
		);
	});

	it("should have optional debug field", () => {
		expectTypeOf<CreateCoreOptions<typeof actions, typeof contexts>>().toHaveProperty("debug");
	});

	it("should accept debug option", () => {
		createCore({ actions, contexts, debug: true });
		createCore({ actions, contexts, debug: false });
	});

	it("should accept omitted debug option", () => {
		createCore({ actions, contexts });
	});

	it("should reject missing fields", () => {
		// @ts-expect-error missing contexts
		createCore({ actions });
		// @ts-expect-error missing actions
		createCore({ contexts });
	});

	it("should accept correct binding shapes for action types", () => {
		const validContexts = defineContexts({
			gameplay: {
				bindings: {
					jump: [Enum.KeyCode.Space],
					move: [
						{
							down: Enum.KeyCode.S,
							left: Enum.KeyCode.A,
							right: Enum.KeyCode.D,
							up: Enum.KeyCode.W,
						},
					],
				},
				priority: 0,
			},
		});

		createCore({ actions, contexts: validContexts });
	});

	it("should reject wrong binding shape for action type", () => {
		const wrongContexts = defineContexts({
			gameplay: {
				bindings: {
					jump: [
						{
							down: Enum.KeyCode.S,
							left: Enum.KeyCode.A,
							right: Enum.KeyCode.D,
							up: Enum.KeyCode.W,
						},
					],
				},
				priority: 0,
			},
		});

		// @ts-expect-error Direction2D preset on Bool action
		createCore({ actions, contexts: wrongContexts });
	});
});

describe("createCore", () => {
	it("should return FluxCore typed with actions and context names", () => {
		expectTypeOf(core).toEqualTypeOf<FluxCore<typeof actions, "gameplay" | "ui">>();
	});

	describe("register", () => {
		it("should require parent as first arg", () => {
			expectTypeOf(
				core.register(new Instance("Folder"), "gameplay"),
			).toEqualTypeOf<InputHandle>();
		});

		it("should accept variadic context names", () => {
			expectTypeOf<typeof core.register>().toBeCallableWith(
				new Instance("Folder"),
				"gameplay",
				"ui",
			);
		});

		it("should reject missing parent", () => {
			// @ts-expect-error missing parent
			core.register("gameplay");
		});

		it("should reject invalid context on register", () => {
			// @ts-expect-error unknown context
			core.register(new Instance("Folder"), INVALID);
		});
	});

	describe("subscribe", () => {
		it("should return LuaTuple of handle and cancel", () => {
			expectTypeOf<ReturnType<typeof core.subscribe>>().toEqualTypeOf<
				[InputHandle, () => void]
			>();
		});

		it("should accept variadic context names", () => {
			expectTypeOf<typeof core.subscribe>().toBeCallableWith(
				new Instance("Folder"),
				"gameplay",
				"ui",
			);
		});

		it("should reject missing parent", () => {
			// @ts-expect-error missing parent
			core.subscribe("gameplay");
		});

		it("should reject invalid context on subscribe", () => {
			// @ts-expect-error unknown context
			core.subscribe(new Instance("Folder"), INVALID);
		});
	});

	describe("addContext", () => {
		it("should constrain to known context names", () => {
			const handle = {} as InputHandle;
			expectTypeOf<typeof core.addContext>().toBeCallableWith(handle, "ui");
		});

		it("should return cancel function", () => {
			const handle = {} as InputHandle;
			expectTypeOf(core.addContext(handle, "ui")).toEqualTypeOf<() => void>();
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

	describe("getBindings", () => {
		it("should constrain action param to valid action names", () => {
			const handle = {} as InputHandle;
			expectTypeOf<typeof core.getBindings>().toBeCallableWith(handle, "jump");
			expectTypeOf<typeof core.getBindings>().toBeCallableWith(handle, "move");
		});

		it("should constrain context param to valid context names", () => {
			const handle = {} as InputHandle;
			expectTypeOf<typeof core.getBindings>().toBeCallableWith(handle, "jump", "gameplay");
			expectTypeOf<typeof core.getBindings>().toBeCallableWith(handle, "jump", "ui");
		});

		it("should return ReadonlyArray<BindingLike>", () => {
			const handle = {} as InputHandle;
			expectTypeOf(core.getBindings(handle, "jump")).toEqualTypeOf<
				ReadonlyArray<BindingLike>
			>();
		});

		it("should reject invalid action names", () => {
			const handle = {} as InputHandle;
			// @ts-expect-error unknown action
			core.getBindings(handle, INVALID);
		});

		it("should reject invalid context names", () => {
			const handle = {} as InputHandle;
			// @ts-expect-error unknown context
			core.getBindings(handle, "jump", INVALID);
		});
	});

	describe("getAllBindings", () => {
		it("should return correct record type", () => {
			const handle = {} as InputHandle;
			expectTypeOf(core.getAllBindings(handle)).toEqualTypeOf<
				Record<"jump" | "move", ReadonlyArray<BindingLike>>
			>();
		});

		it("should constrain context param to valid context names", () => {
			const handle = {} as InputHandle;
			expectTypeOf<typeof core.getAllBindings>().toBeCallableWith(handle, "gameplay");
			expectTypeOf<typeof core.getAllBindings>().toBeCallableWith(handle, "ui");
		});

		it("should reject invalid context names", () => {
			const handle = {} as InputHandle;
			// @ts-expect-error unknown context
			core.getAllBindings(handle, INVALID);
		});
	});
});
