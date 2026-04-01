import { type ActionMap, type ContextConfig, HandleError } from "@rbxts/flux";
import Jecs from "@rbxts/jecs";
import { describe, expect, it } from "@rbxts/jest-globals";
import RegExp from "@rbxts/regexp";

import { createFluxJecs } from "./create-flux-jecs";

const TEST_ACTIONS = {
	jump: { type: "Bool" as const },
	move: { type: "Direction2D" as const },
} satisfies ActionMap;

const TEST_CONTEXTS = {
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
	},
} satisfies Record<string, ContextConfig>;

describe("createFluxJecs", () => {
	it("should register entity, set ActionState component, and add context tag", () => {
		expect.assertions(4);

		const world = Jecs.world();
		const flux = createFluxJecs(world, {
			actions: TEST_ACTIONS,
			contexts: TEST_CONTEXTS,
		});

		const entity = world.entity();
		flux.register(entity, new Instance("Folder"), "gameplay");

		// ActionState component was set on the entity
		expect(world.has(entity, flux.ActionState)).toBeTrue();

		// Context tag was added
		expect(world.has(entity, flux.contexts.gameplay)).toBeTrue();

		// getState returns an ActionState
		const state = flux.getState(entity);

		expect(state.pressed("jump")).toBeFalse();

		// update processes input — simulate and verify
		flux.simulateAction(entity, "jump", true);
		flux.update(0.016);

		expect(flux.getState(entity).pressed("jump")).toBeTrue();
	});

	it("should add tags for all registered contexts", () => {
		expect.assertions(2);

		const world = Jecs.world();
		const flux = createFluxJecs(world, {
			actions: TEST_ACTIONS,
			contexts: TEST_CONTEXTS,
		});

		const entity = world.entity();
		flux.register(entity, new Instance("Folder"), "gameplay", "ui");

		expect(world.has(entity, flux.contexts.gameplay)).toBeTrue();
		expect(world.has(entity, flux.contexts.ui)).toBeTrue();
	});

	it("should use provided actionStateComponent", () => {
		expect.assertions(1);

		const world = Jecs.world();
		const customComponent = world.component<never>();
		const flux = createFluxJecs(world, {
			actions: TEST_ACTIONS,
			actionStateComponent: customComponent,
			contexts: TEST_CONTEXTS,
		});

		expect(flux.ActionState).toBe(customComponent);
	});

	it("should throw when registering the same entity twice", () => {
		expect.assertions(1);

		const world = Jecs.world();
		const flux = createFluxJecs(world, {
			actions: TEST_ACTIONS,
			contexts: TEST_CONTEXTS,
		});

		const entity = world.entity();
		flux.register(entity, new Instance("Folder"), "gameplay");

		expect(() => {
			flux.register(entity, new Instance("Folder"), "ui");
		}).toThrowWithMessage(HandleError, RegExp("handle already registered"));
	});
});
