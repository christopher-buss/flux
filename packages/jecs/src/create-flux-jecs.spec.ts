import type { ActionMap, ContextConfig } from "@rbxts/flux";
import Jecs from "@rbxts/jecs";
import { describe, expect, it } from "@rbxts/jest-globals";

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

	it("should keep a context tag the entity already carries", () => {
		expect.assertions(1);

		const world = Jecs.world();
		const flux = createFluxJecs(world, {
			actions: TEST_ACTIONS,
			contexts: TEST_CONTEXTS,
		});

		const entity = world.entity();
		world.add(entity, flux.contexts.gameplay);
		flux.register(entity, new Instance("Folder"), "gameplay");

		expect(world.has(entity, flux.contexts.gameplay)).toBeTrue();
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
		}).toThrow("handle already registered");
	});

	describe("claims", () => {
		it("should read a claimed action as inert through the ActionState component", () => {
			expect.assertions(2);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay");
			flux.simulateAction(entity, "jump", true);
			flux.update(0.016);

			const state = world.get(entity, flux.ActionState)!;

			expect(state.pressed("jump")).toBeTrue();

			state.claim("jump");

			expect(state.pressed("jump")).toBeFalse();
		});
	});

	describe("unregister", () => {
		it("should remove ActionState component and context tags from entity", () => {
			expect.assertions(3);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay", "ui");
			flux.unregister(entity);

			expect(world.has(entity, flux.ActionState)).toBeFalse();
			expect(world.has(entity, flux.contexts.gameplay)).toBeFalse();
			expect(world.has(entity, flux.contexts.ui)).toBeFalse();
		});

		it("should make getState throw after unregister", () => {
			expect.assertions(1);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay");
			flux.unregister(entity);

			expect(() => {
				flux.getState(entity);
			}).toThrow("not registered");
		});
	});

	describe("addContext", () => {
		it("should activate context and add jecs tag", () => {
			expect.assertions(2);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay");
			flux.addContext(entity, "ui");

			expect(flux.hasContext(entity, "ui")).toBeTrue();
			expect(world.has(entity, flux.contexts.ui)).toBeTrue();
		});

		it("should throw on duplicate context", () => {
			expect.assertions(1);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay");

			expect(() => {
				flux.addContext(entity, "gameplay");
			}).toThrow("context already active");
		});
	});

	describe("removeContext", () => {
		it("should deactivate context and remove jecs tag without affecting others", () => {
			expect.assertions(4);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay", "ui");
			flux.removeContext(entity, "ui");

			expect(flux.hasContext(entity, "ui")).toBeFalse();
			expect(world.has(entity, flux.contexts.ui)).toBeFalse();
			expect(flux.hasContext(entity, "gameplay")).toBeTrue();
			expect(world.has(entity, flux.contexts.gameplay)).toBeTrue();
		});

		it("should throw on inactive context", () => {
			expect.assertions(1);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay");

			expect(() => {
				flux.removeContext(entity, "ui");
			}).toThrow("context not active");
		});
	});

	describe("hasContext", () => {
		it("should return true for active and false for inactive context", () => {
			expect.assertions(2);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay");

			expect(flux.hasContext(entity, "gameplay")).toBeTrue();
			expect(flux.hasContext(entity, "ui")).toBeFalse();
		});
	});

	describe("getContexts", () => {
		it("should return all active context names", () => {
			expect.assertions(1);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay", "ui");

			const active = flux.getContexts(entity);

			expect(active).toStrictEqual(expect.arrayContaining(["gameplay", "ui"]));
		});
	});

	describe("destroy", () => {
		it("should make all handle operations throw", () => {
			expect.assertions(1);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay");
			flux.destroy();

			expect(() => {
				flux.getState(entity);
			}).toThrow("not registered");
		});

		it("should clean up multiple registered entities", () => {
			expect.assertions(2);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const first = world.entity();
			const second = world.entity();
			flux.register(first, new Instance("Folder"), "gameplay");
			flux.register(second, new Instance("Folder"), "ui");
			flux.destroy();

			expect(() => {
				flux.getState(first);
			}).toThrow("not registered");
			expect(() => {
				flux.getState(second);
			}).toThrow("not registered");
		});
	});

	describe("core", () => {
		it("should expose the underlying FluxCore instance", () => {
			expect.assertions(1);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			expect(typeOf(flux.core.update)).toBe("function");
		});
	});

	describe("subscribe", () => {
		it("should set ActionState component, add context tags, and return cancel function", () => {
			expect.assertions(5);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const parent = new Instance("Folder");
			const inputFolder = new Instance("Folder");
			inputFolder.Name = "InputContexts";
			inputFolder.Parent = parent;
			const gameplay = new Instance("Folder");
			gameplay.Name = "gameplay";
			gameplay.Parent = inputFolder;

			const entity = world.entity();
			const cancel = flux.subscribe(entity, parent, "gameplay");

			expect(world.has(entity, flux.ActionState)).toBeTrue();
			expect(world.has(entity, flux.contexts.gameplay)).toBeTrue();
			expect(typeOf(cancel)).toBe("function");

			// Cancel should allow unregister without error
			cancel();
			flux.unregister(entity);

			expect(world.has(entity, flux.ActionState)).toBeFalse();
			expect(world.has(entity, flux.contexts.gameplay)).toBeFalse();
		});

		it("should throw when subscribing the same entity twice", () => {
			expect.assertions(1);

			const world = Jecs.world();
			const flux = createFluxJecs(world, {
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
			});

			const parent = new Instance("Folder");
			const inputFolder = new Instance("Folder");
			inputFolder.Name = "InputContexts";
			inputFolder.Parent = parent;
			const gameplay = new Instance("Folder");
			gameplay.Name = "gameplay";
			gameplay.Parent = inputFolder;

			const entity = world.entity();
			flux.subscribe(entity, parent, "gameplay");

			expect(() => {
				flux.subscribe(entity, parent, "gameplay");
			}).toThrow("handle already registered");
		});
	});

	describe("binding reads", () => {
		it("should read context info for the entity", () => {
			expect.assertions(2);

			const world = Jecs.world();
			const flux = createFluxJecs(world, { actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay");

			expect(flux.getContextInfo(entity, "gameplay").active).toBeTrue();
			expect(flux.getContextInfo(entity, "ui").priority).toBe(10);
		});

		it("should read default bindings for the entity", () => {
			expect.assertions(4);

			const world = Jecs.world();
			const flux = createFluxJecs(world, { actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay");

			expect(flux.getBindings(entity, "jump")).toStrictEqual([Enum.KeyCode.Space]);
			expect(flux.getBindingsForPlatform(entity, "jump", "keyboard")).toStrictEqual([
				Enum.KeyCode.Space,
			]);
			expect(flux.getAllBindings(entity).move).toStrictEqual([Enum.KeyCode.W]);
			expect(flux.getBindingOrigin(entity, "jump", "keyboard")).toBe("default");
		});

		it("should read the neutral value of an action", () => {
			expect.assertions(2);

			const world = Jecs.world();
			const flux = createFluxJecs(world, { actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			expect(flux.getNeutralValue("jump")).toBeFalse();
			expect(flux.getNeutralValue("move")).toBe(Vector2.zero);
		});
	});

	describe("rebinding", () => {
		it("should rebind and reset an action for the entity", () => {
			expect.assertions(3);

			const world = Jecs.world();
			const flux = createFluxJecs(world, { actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay");

			flux.rebind(entity, "jump", [Enum.KeyCode.J]);

			expect(flux.getBindings(entity, "jump")).toStrictEqual([Enum.KeyCode.J]);
			expect(flux.getBindingOrigin(entity, "jump", "keyboard")).toBe("override");

			flux.resetBindings(entity, "jump");

			expect(flux.getBindings(entity, "jump")).toStrictEqual([Enum.KeyCode.Space]);
		});

		it("should rebind and reset one platform for the entity", () => {
			expect.assertions(4);

			const world = Jecs.world();
			const flux = createFluxJecs(world, { actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const entity = world.entity();
			flux.register(entity, new Instance("Folder"), "gameplay");

			flux.rebindForPlatform(entity, "jump", "gamepad", [Enum.KeyCode.ButtonY]);

			expect(flux.getBindingsForPlatform(entity, "jump", "gamepad")).toStrictEqual([
				Enum.KeyCode.ButtonY,
			]);

			flux.resetBindingsForPlatform(entity, "jump", "gamepad");

			expect(flux.getBindingOrigin(entity, "jump", "gamepad")).toBe("default");

			flux.rebindForPlatform(entity, "jump", "gamepad", [Enum.KeyCode.ButtonY]);
			flux.resetAllBindingsForPlatform(entity, "gamepad");

			expect(flux.getBindingOrigin(entity, "jump", "gamepad")).toBe("default");
			expect(flux.getBindings(entity, "jump")).toStrictEqual([Enum.KeyCode.Space]);
		});

		it("should round-trip bindings through serialize and load", () => {
			expect.assertions(3);

			const world = Jecs.world();
			const flux = createFluxJecs(world, { actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const source = world.entity();
			const target = world.entity();
			flux.register(source, new Instance("Folder"), "gameplay");
			flux.register(target, new Instance("Folder"), "gameplay");

			flux.rebind(source, "jump", [Enum.KeyCode.J]);
			flux.loadBindings(target, flux.serializeBindings(source));

			expect(flux.getBindings(target, "jump")).toStrictEqual([Enum.KeyCode.J]);

			flux.resetAllBindings(target);

			expect(flux.getBindings(target, "jump")).toStrictEqual([Enum.KeyCode.Space]);

			flux.rebindAll(target, flux.serializeBindings(source));

			expect(flux.getBindings(target, "jump")).toStrictEqual([Enum.KeyCode.J]);
		});
	});
});
