import type { ActionState } from "@rbxts/flux";
import { bool, defineActions, defineContexts, direction2d } from "@rbxts/flux";
import type { Entity, Tag } from "@rbxts/jecs";
import Jecs from "@rbxts/jecs";
import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { createFluxJecs } from "./create-flux-jecs";

const actions = defineActions({
	jump: bool(),
	move: direction2d(),
});

const contexts = defineContexts({
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.Space],
			move: [Enum.KeyCode.W],
		},
		priority: 0,
	},
	ui: {
		bindings: {
			jump: [Enum.KeyCode.Return],
		},
		priority: 10,
		sink: true,
	},
});

const world = Jecs.world();
const flux = createFluxJecs(world, { actions, contexts });
const entity = {} as Entity;
const INVALID = "nonexistent";

describe("createFluxJecs", () => {
	describe("ActionState property", () => {
		it("should be typed as Entity<ActionState<T>>", () => {
			expectTypeOf(flux.ActionState).toEqualTypeOf<Entity<ActionState<typeof actions>>>();
		});
	});

	describe("contexts property", () => {
		it("should be a frozen record of Tag per context name", () => {
			expectTypeOf(flux.contexts).toEqualTypeOf<Readonly<Record<"gameplay" | "ui", Tag>>>();
		});

		it("should allow accessing known context tags", () => {
			expectTypeOf(flux.contexts.gameplay).toEqualTypeOf<Tag>();
			expectTypeOf(flux.contexts.ui).toEqualTypeOf<Tag>();
		});
	});

	describe("register", () => {
		it("should accept entity, parent, and context names", () => {
			expectTypeOf<typeof flux.register>().toBeCallableWith(
				entity,
				new Instance("Folder"),
				"gameplay",
			);
		});

		it("should accept variadic context names", () => {
			expectTypeOf<typeof flux.register>().toBeCallableWith(
				entity,
				new Instance("Folder"),
				"gameplay",
				"ui",
			);
		});

		it("should reject invalid context name", () => {
			// @ts-expect-error unknown context
			flux.register(entity, new Instance("Folder"), INVALID);
		});

		it("should return void", () => {
			expectTypeOf<typeof flux.register>().returns.toEqualTypeOf<void>();
		});
	});

	describe("unregister", () => {
		it("should accept entity and return void", () => {
			expectTypeOf<typeof flux.unregister>().toBeCallableWith(entity);
			expectTypeOf<typeof flux.unregister>().returns.toEqualTypeOf<void>();
		});
	});

	describe("subscribe", () => {
		it("should accept entity, parent, and context names", () => {
			expectTypeOf<typeof flux.subscribe>().toBeCallableWith(
				entity,
				new Instance("Folder"),
				"gameplay",
			);
		});

		it("should accept variadic context names", () => {
			expectTypeOf<typeof flux.subscribe>().toBeCallableWith(
				entity,
				new Instance("Folder"),
				"gameplay",
				"ui",
			);
		});

		it("should reject invalid context name", () => {
			// @ts-expect-error unknown context
			flux.subscribe(entity, new Instance("Folder"), INVALID);
		});

		it("should return a cancel function", () => {
			expectTypeOf<typeof flux.subscribe>().returns.toEqualTypeOf<() => void>();
		});
	});

	describe("getState", () => {
		it("should return typed ActionState", () => {
			expectTypeOf(flux.getState(entity)).toEqualTypeOf<ActionState<typeof actions>>();
		});
	});

	describe("simulateAction", () => {
		it("should accept valid action names", () => {
			expectTypeOf<typeof flux.simulateAction>().toBeCallableWith(entity, "jump", true);
		});

		it("should reject invalid action name", () => {
			// @ts-expect-error unknown action
			flux.simulateAction(entity, INVALID, true);
		});

		it("should reject wrong payload type for action", () => {
			// @ts-expect-error Vector2 is not valid for Bool action "jump"
			flux.simulateAction(entity, "jump", new Vector2());
		});
	});

	describe("update", () => {
		it("should accept deltaTime number", () => {
			expectTypeOf<typeof flux.update>().parameter(0).toEqualTypeOf<number>();
			expectTypeOf<typeof flux.update>().returns.toEqualTypeOf<void>();
		});
	});
});

describe("FluxJecsOptions", () => {
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
		createFluxJecs(world, { actions, contexts: wrongContexts });
	});

	it("should accept actionStateComponent option", () => {
		const component = world.component<ActionState<typeof actions>>();
		createFluxJecs(world, { actions, actionStateComponent: component, contexts });
	});

	it("should reject missing actions", () => {
		// @ts-expect-error missing actions
		createFluxJecs(world, { contexts });
	});

	it("should reject missing contexts", () => {
		// @ts-expect-error missing contexts
		createFluxJecs(world, { actions });
	});
});
