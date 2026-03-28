import { describe, expect, it } from "@rbxts/jest-globals";
import RegExp from "@rbxts/regexp";

import { ContextError } from "../errors/context-error";
import { FluxError } from "../errors/flux-error";
import { HandleError } from "../errors/handle-error";
import type { ActionMap } from "../types/actions";
import type { ContextConfig } from "../types/contexts";
import { createCore } from "./create-core";

const TEST_ACTIONS = {
	cursor: { type: "ViewportPosition" as const },
	jump: { type: "Bool" as const },
	look: { type: "Direction3D" as const },
	move: { type: "Direction2D" as const },
	throttle: { type: "Direction1D" as const },
} satisfies ActionMap;

const TEST_CONTEXTS = {
	gameplay: {
		bindings: {
			cursor: [Enum.KeyCode.Unknown],
			jump: [Enum.KeyCode.Space],
			look: [Enum.KeyCode.E],
			move: [Enum.KeyCode.W],
			throttle: [Enum.KeyCode.LeftShift],
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
} satisfies Record<string, ContextConfig>;

describe("createCore", () => {
	it("should return object with all FluxCore methods", () => {
		expect.assertions(1);

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

		expect(typeIs(core, "table")).toBeTrue();
	});

	it("should validate unknown context names at runtime", () => {
		expect.assertions(1);

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const register = () => {
			core.register("nonexistent" as never);
		};

		expect(register).toThrow("unknown context");
	});

	describe("register", () => {
		it("should return unique InputHandle", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const first = core.register("gameplay");
			const second = core.register("gameplay");

			expect(first).never.toBe(second);
		});

		it("should set up requested contexts", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");

			expect(core.hasContext(handle, "gameplay")).toBeTrue();
		});
	});

	describe("getState", () => {
		it("should return ActionState for registered handle", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const state = core.getState(handle);

			expect(state.pressed("jump")).toBeFalse();
			expect(state.direction2d("move")).toBe(Vector2.zero);
		});

		it("should throw for unregistered handle", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.unregister(handle);
			const getState = () => {
				core.getState(handle);
			};

			expect(getState).toThrow("handle not registered");
		});
	});

	describe("unregister", () => {
		it("should clean up handle", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.unregister(handle);
			const getState = () => {
				core.getState(handle);
			};

			expect(getState).toThrow("handle not registered");
		});
	});

	describe("addContext / removeContext / hasContext / getContexts", () => {
		it("should add context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.addContext(handle, "ui");

			expect(core.hasContext(handle, "ui")).toBeTrue();
		});

		it("should throw when adding already active context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const addContext = () => {
				core.addContext(handle, "gameplay");
			};

			expect(addContext).toThrow("context already active");
		});

		it("should remove context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay", "ui");
			core.removeContext(handle, "ui");

			expect(core.hasContext(handle, "ui")).toBeFalse();
		});

		it("should throw when removing inactive context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const removeContext = () => {
				core.removeContext(handle, "ui");
			};

			expect(removeContext).toThrow("context not active");
		});

		it("should return all active contexts", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay", "ui");
			const contexts = core.getContexts(handle);

			expect(contexts).toContain("gameplay");
			expect(contexts).toContain("ui");
		});
	});

	describe("update", () => {
		it("should process pipeline for registered handles", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should clear simulated values after update", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeFalse();
		});

		it("should default Direction1D actions to zero", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.update(0.016);

			expect(core.getState(handle).axis1d("throttle")).toBe(0);
		});

		it("should default Direction3D actions to Vector3.zero", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.update(0.016);

			expect(core.getState(handle).axis3d("look")).toBe(Vector3.zero);
		});

		it("should accumulate duration across frames", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).currentDuration("jump")).toBeCloseTo(0.032);
		});
	});

	describe("context priority", () => {
		it("should resolve higher priority context first", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay", "ui");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});
	});

	describe("overlapping bindings", () => {
		it("should process action only once across non-sink contexts", () => {
			expect.assertions(1);

			const actions = { jump: { type: "Bool" as const } } satisfies ActionMap;
			const contexts = {
				combat: {
					bindings: { jump: [Enum.KeyCode.Space] },
					priority: 5,
				},
				gameplay: {
					bindings: { jump: [Enum.KeyCode.Space] },
					priority: 0,
				},
			} satisfies Record<string, ContextConfig>;
			const core = createCore({ actions, contexts });
			const handle = core.register("gameplay", "combat");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});
	});

	describe("nonexistent action binding", () => {
		it("should skip bindings for actions not in the action map", () => {
			expect.assertions(1);

			const actions = { jump: { type: "Bool" as const } } satisfies ActionMap;
			const contexts = {
				gameplay: {
					bindings: {
						jump: [Enum.KeyCode.Space],
						nonexistent: [Enum.KeyCode.E],
					},
					priority: 0,
				},
			} satisfies Record<string, ContextConfig>;
			const core = createCore({ actions, contexts });
			const handle = core.register("gameplay");
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeFalse();
		});
	});

	describe("unbound actions", () => {
		it("should default actions not bound in any active context", () => {
			expect.assertions(1);

			const actions = {
				jump: { type: "Bool" as const },
				unbound: { type: "Bool" as const },
			} satisfies ActionMap;
			const contexts = {
				gameplay: {
					bindings: { jump: [Enum.KeyCode.Space] },
					priority: 0,
				},
			} satisfies Record<string, ContextConfig>;
			const core = createCore({ actions, contexts });
			const handle = core.register("gameplay");
			core.update(0.016);

			expect(core.getState(handle).pressed("unbound")).toBeFalse();
		});
	});

	describe("context sink", () => {
		it("should block lower priority contexts when sink is true", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay", "ui");
			core.simulateAction(handle, "move", new Vector2(1, 0));
			core.update(0.016);

			const state = core.getState(handle);

			expect(state.direction2d("move")).toBe(Vector2.zero);
		});
	});

	describe("simulateAction", () => {
		it("should inject value consumed by next update", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should support Direction2D values", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const direction = new Vector2(0.5, -0.3);
			core.simulateAction(handle, "move", direction);
			core.update(0.016);

			const result = core.getState(handle).direction2d("move");

			expect(result.X).toBeCloseTo(0.5);
			expect(result.Y).toBeCloseTo(-0.3);
		});
	});

	describe("destroy", () => {
		it("should clean up all handles", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const first = core.register("gameplay");
			const second = core.register("ui");
			core.destroy();
			const getFirstState = () => {
				core.getState(first);
			};

			const getSecondState = () => {
				core.getState(second);
			};

			expect(getFirstState).toThrow("handle not registered");
			expect(getSecondState).toThrow("handle not registered");
		});
	});

	describe("parent option", () => {
		it("should work without parent", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should pass parent to input instances", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS, parent });
			const handle = core.register("gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});
	});

	describe("iAS instances", () => {
		it("should create InputContext instances on register", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");

			// Verify update still works (contexts were created)
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should destroy instances on unregister", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.unregister(handle);
			const getState = () => {
				core.getState(handle);
			};

			expect(getState).toThrow("handle not registered");
		});

		it("should destroy all instances on destroy", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const first = core.register("gameplay");
			const second = core.register("ui");
			core.destroy();
			const getFirstState = () => {
				core.getState(first);
			};

			const getSecondState = () => {
				core.getState(second);
			};

			expect(getFirstState).toThrow("handle not registered");
			expect(getSecondState).toThrow("handle not registered");
		});

		it("should create InputContext instances for added contexts", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.addContext(handle, "ui");

			expect(core.hasContext(handle, "ui")).toBeTrue();
		});

		it("should disable InputContext on removeContext", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay", "ui");
			core.removeContext(handle, "ui");

			expect(core.hasContext(handle, "ui")).toBeFalse();
		});

		it("should fire InputAction on simulateAction", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});
	});

	describe("p1 stubs", () => {
		it("should throw not implemented for rebind", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const rebind = () => {
				core.rebind(handle, "jump", [Enum.KeyCode.Space]);
			};

			expect(rebind).toThrow("Not implemented");
		});

		it("should throw not implemented for rebindAll", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const rebindAll = () => {
				core.rebindAll(handle, {});
			};

			expect(rebindAll).toThrow("Not implemented");
		});

		it("should throw not implemented for resetBindings", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const resetBindings = () => {
				core.resetBindings(handle, "jump");
			};

			expect(resetBindings).toThrow("Not implemented");
		});

		it("should throw not implemented for resetAllBindings", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const resetAllBindings = () => {
				core.resetAllBindings(handle);
			};

			expect(resetAllBindings).toThrow("Not implemented");
		});

		it("should throw not implemented for serializeBindings", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const serializeBindings = () => {
				core.serializeBindings(handle);
			};

			expect(serializeBindings).toThrow("Not implemented");
		});

		it("should throw not implemented for loadBindings", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const loadBindings = () => {
				core.loadBindings(handle, {});
			};

			expect(loadBindings).toThrow("Not implemented");
		});
	});

	describe("error types", () => {
		it("should throw ContextError for unknown context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const register = () => {
				core.register("nonexistent" as never);
			};

			expect(register).toThrowWithMessage(ContextError, RegExp("unknown context"));
		});

		it("should throw ContextError for duplicate context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const addContext = () => {
				core.addContext(handle, "gameplay");
			};

			expect(addContext).toThrowWithMessage(ContextError, RegExp("context already active"));
		});

		it("should throw ContextError for inactive context removal", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			const removeContext = () => {
				core.removeContext(handle, "ui");
			};

			expect(removeContext).toThrowWithMessage(ContextError, RegExp("context not active"));
		});

		it("should throw HandleError for unregistered handle", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register("gameplay");
			core.unregister(handle);
			const getState = () => {
				core.getState(handle);
			};

			expect(getState).toThrowWithMessage(HandleError, RegExp("handle not registered"));
		});

		it("should produce FluxError-compatible inheritance chain", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const register = () => {
				core.register("nonexistent" as never);
			};

			expect(register).toThrowWithMessage(FluxError, RegExp("unknown context"));
		});

		it("should format toString as name and message", () => {
			expect.assertions(1);

			const thrown = new ContextError("unknown context: nonexistent", "nonexistent");

			expect(thrown.toString()).toBe("ContextError: unknown context: nonexistent");
		});
	});
});
