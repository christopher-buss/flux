import { awaitDefer } from "@flux/test-utils";
import { describe, expect, it, jest } from "@rbxts/jest-globals";
import { fromAny, fromPartial } from "@rbxts/jest-utils";
import RegExp from "@rbxts/regexp";

import { ContextError } from "../errors/context-error";
import { FluxError } from "../errors/flux-error";
import { HandleError } from "../errors/handle-error";
import { hold, implicit, tap } from "../triggers";
import type { ActionMap } from "../types/actions";
import type { ContextConfig } from "../types/contexts";
import type { InputHandle } from "../types/core";
import { createCore } from "./create-core";

_G.__DEV__ = true;

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

const TRIGGER_ACTIONS = {
	charge: {
		triggers: [implicit(hold({ attempting: 0.1, threshold: 0.5 }))],
		type: "Bool" as const,
	},
	dash: {
		triggers: [implicit(tap({ threshold: 0.2 }))],
		type: "Bool" as const,
	},
} satisfies ActionMap;

const TRIGGER_CONTEXTS = {
	gameplay: {
		bindings: {
			charge: [Enum.KeyCode.E],
			dash: [Enum.KeyCode.Q],
		},
		priority: 0,
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
			core.register(new Instance("Folder"), fromAny("nonexistent"));
		};

		expect(register).toThrow("unknown context");
	});

	describe("register", () => {
		it("should return unique InputHandle", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const first = core.register(new Instance("Folder"), "gameplay");
			const second = core.register(new Instance("Folder"), "gameplay");

			expect(first).never.toBe(second);
		});

		it("should set up requested contexts", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");

			expect(core.hasContext(handle, "gameplay")).toBeTrue();
		});
	});

	describe("getState", () => {
		it("should return ActionState for registered handle", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const state = core.getState(handle);

			expect(state.pressed("jump")).toBeFalse();
			expect(state.direction2d("move")).toBe(Vector2.zero);
		});

		it("should throw for unregistered handle", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
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
			const handle = core.register(new Instance("Folder"), "gameplay");
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
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.addContext(handle, "ui");

			expect(core.hasContext(handle, "ui")).toBeTrue();
		});

		it("should return a callable cancel function from addContext", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const cancel = core.addContext(handle, "ui");

			expect(() => {
				cancel();
			}).never.toThrow();
		});

		it("should throw when adding already active context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const addContext = () => {
				core.addContext(handle, "gameplay");
			};

			expect(addContext).toThrow("context already active");
		});

		it("should remove context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay", "ui");
			core.removeContext(handle, "ui");

			expect(core.hasContext(handle, "ui")).toBeFalse();
		});

		it("should throw when removing inactive context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const removeContext = () => {
				core.removeContext(handle, "ui");
			};

			expect(removeContext).toThrow("context not active");
		});

		it("should return all active contexts", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay", "ui");
			const contexts = core.getContexts(handle);

			expect(contexts).toContain("gameplay");
			expect(contexts).toContain("ui");
		});
	});

	describe("getContextInfo", () => {
		it("should return info with active=true for an active context", () => {
			expect.assertions(4);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const info = core.getContextInfo(handle, "gameplay");

			expect(info.active).toBeTrue();
			expect(info.priority).toBe(0);
			expect(info.sink).toBeFalse();
			expect(info.actions).toContain("jump");
		});

		it("should return info with active=false for an inactive context", () => {
			expect.assertions(3);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const info = core.getContextInfo(handle, "ui");

			expect(info.active).toBeFalse();
			expect(info.priority).toBe(10);
			expect(info.sink).toBeTrue();
		});

		it("should flip active when addContext/removeContext runs", () => {
			expect.assertions(3);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");

			expect(core.getContextInfo(handle, "ui").active).toBeFalse();

			core.addContext(handle, "ui");

			expect(core.getContextInfo(handle, "ui").active).toBeTrue();

			core.removeContext(handle, "ui");

			expect(core.getContextInfo(handle, "ui").active).toBeFalse();
		});

		it("should apply DEFAULT_CONTEXT_PRIORITY when priority omitted", () => {
			expect.assertions(1);

			const contexts = {
				defaulted: {
					bindings: {
						jump: [Enum.KeyCode.Space],
					},
				},
			} satisfies Record<string, ContextConfig>;
			const actions = { jump: { type: "Bool" as const } } satisfies ActionMap;
			const core = createCore({ actions, contexts });
			const handle = core.register(new Instance("Folder"), "defaulted");
			const info = core.getContextInfo(handle, "defaulted");

			expect(info.priority).toBe(1000);
		});

		it("should default sink to false when omitted", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const info = core.getContextInfo(handle, "gameplay");

			expect(info.sink).toBeFalse();
		});

		it("should return all declared actions for the context", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const info = core.getContextInfo(handle, "gameplay");

			expect(info.actions.size()).toBe(5);
			expect(new Set(info.actions)).toStrictEqual(
				new Set(["cursor", "jump", "look", "move", "throttle"]),
			);
		});

		it("should throw on unknown context name", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const query = () => {
				core.getContextInfo(handle, fromAny("nonexistent"));
			};

			expect(query).toThrow("unknown context");
		});

		it("should throw on invalid handle", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const query = () => {
				core.getContextInfo(fromAny(999), "gameplay");
			};

			expect(query).toThrow("handle");
		});
	});

	describe("update", () => {
		it("should process pipeline for registered handles", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should clear simulated values after update", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeFalse();
		});

		it("should default Direction1D actions to zero", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.update(0.016);

			expect(core.getState(handle).axis1d("throttle")).toBe(0);
		});

		it("should default Direction3D actions to Vector3.zero", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.update(0.016);

			expect(core.getState(handle).axis3d("look")).toBe(Vector3.zero);
		});

		it("should accumulate duration across frames", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
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
			const handle = core.register(new Instance("Folder"), "gameplay", "ui");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});
	});

	describe("default priority", () => {
		it("should use default priority when not specified", () => {
			expect.assertions(1);

			const actions = { jump: { type: "Bool" as const } } satisfies ActionMap;
			const contexts = {
				gameplay: {
					bindings: { jump: [Enum.KeyCode.Space] },
				},
				menu: {
					bindings: { jump: [Enum.KeyCode.Space] },
				},
				ui: {
					bindings: { jump: [Enum.KeyCode.Space] },
					priority: 10,
				},
			} satisfies Record<string, ContextConfig>;
			const core = createCore({ actions, contexts });
			const handle = core.register(new Instance("Folder"), "gameplay", "menu", "ui");
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
			const handle = core.register(new Instance("Folder"), "gameplay", "combat");
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
			const handle = core.register(new Instance("Folder"), "gameplay");
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
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.update(0.016);

			expect(core.getState(handle).pressed("unbound")).toBeFalse();
		});
	});

	describe("context sink", () => {
		it("should block lower priority contexts when sink is true", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay", "ui");
			core.simulateAction(handle, "move", new Vector2(1, 0));
			core.update(0.016);

			const state = core.getState(handle);

			expect(state.direction2d("move")).toBe(Vector2.zero);
		});
	});

	describe("triggers", () => {
		it("should fire tap on release when held for less than threshold", () => {
			expect.assertions(2);

			const core = createCore({ actions: TRIGGER_ACTIONS, contexts: TRIGGER_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");

			core.simulateAction(handle, "dash", true);
			core.update(0.1);

			expect(core.getState(handle).pressed("dash")).toBeFalse();

			core.simulateAction(handle, "dash", false);
			core.update(0.016);

			expect(core.getState(handle).pressed("dash")).toBeTrue();
		});

		it("should cancel hold when released after attempting but before threshold", () => {
			expect.assertions(2);

			const core = createCore({ actions: TRIGGER_ACTIONS, contexts: TRIGGER_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");

			core.simulateAction(handle, "charge", true);
			core.update(0.3);

			expect(core.getState(handle).ongoing("charge")).toBeTrue();

			core.simulateAction(handle, "charge", false);
			core.update(0.016);

			expect(core.getState(handle).canceled("charge")).toBeTrue();
		});
	});

	describe("simulateAction", () => {
		it("should inject value consumed by next update", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should support Direction2D values", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
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
			const first = core.register(new Instance("Folder"), "gameplay");
			const second = core.register(new Instance("Folder"), "ui");
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

	describe("register parent", () => {
		it("should parent InputContexts under the 'input' folder", () => {
			expect.assertions(2);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			core.register(parent, "gameplay");

			const inputFolder = parent.FindFirstChild("input");
			assert(inputFolder);

			expect(classIs(inputFolder, "Folder")).toBeTrue();
			expect(inputFolder.FindFirstChild("gameplay")).toBeDefined();
		});

		it("should support different parents per handle", () => {
			expect.assertions(2);

			const parentA = new Instance("Folder");
			const parentB = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			core.register(parentA, "gameplay");
			core.register(parentB, "ui");

			const folderA = parentA.FindFirstChild("input");
			assert(folderA);
			const folderB = parentB.FindFirstChild("input");
			assert(folderB);

			expect(folderA.FindFirstChild("gameplay")).toBeDefined();
			expect(folderB.FindFirstChild("ui")).toBeDefined();
		});
	});

	describe("iAS instances", () => {
		it("should create InputContext instances on register", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");

			// Verify update still works (contexts were created)
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should destroy instances on unregister", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.unregister(handle);
			const getState = () => {
				core.getState(handle);
			};

			expect(getState).toThrow("handle not registered");
		});

		it("should destroy all instances on destroy", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const first = core.register(new Instance("Folder"), "gameplay");
			const second = core.register(new Instance("Folder"), "ui");
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
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.addContext(handle, "ui");

			expect(core.hasContext(handle, "ui")).toBeTrue();
		});

		it("should disable InputContext on removeContext", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay", "ui");
			core.removeContext(handle, "ui");

			expect(core.hasContext(handle, "ui")).toBeFalse();
		});

		it("should fire InputAction on simulateAction", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});
	});

	describe("error types", () => {
		it("should throw ContextError for unknown context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const register = () => {
				core.register(new Instance("Folder"), fromAny("nonexistent"));
			};

			expect(register).toThrowWithMessage(ContextError, RegExp("unknown context"));
		});

		it("should throw ContextError for duplicate context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const addContext = () => {
				core.addContext(handle, "gameplay");
			};

			expect(addContext).toThrowWithMessage(ContextError, RegExp("context already active"));
		});

		it("should throw when addContext called on subscribed handle with native replication", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				replication: { transport: "native" },
			});

			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");

			const [handle] = core.subscribe(parent, "gameplay");

			expect(() => {
				core.addContext(handle, "ui");
			}).toThrowWithMessage(FluxError, RegExp("native replication"));
		});

		it("should throw ContextError for inactive context removal", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const removeContext = () => {
				core.removeContext(handle, "ui");
			};

			expect(removeContext).toThrowWithMessage(ContextError, RegExp("context not active"));
		});

		it("should throw HandleError for unregistered handle", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
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
				core.register(new Instance("Folder"), fromAny("nonexistent"));
			};

			expect(register).toThrowWithMessage(FluxError, RegExp("unknown context"));
		});

		it("should format toString as name and message", () => {
			expect.assertions(1);

			const thrown = new ContextError("unknown context: nonexistent", "nonexistent");

			expect(thrown.toString()).toBe("ContextError: unknown context: nonexistent");
		});
	});

	describe("subscribe", () => {
		it("should find existing InputContext instances", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			// Simulate server-created instances (full IAS tree)
			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");

			const [handle] = core.subscribe(parent, "gameplay");

			expect(core.hasContext(handle, "gameplay")).toBeTrue();
		});

		it("should return cancel function that disconnects listeners", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			const context = new Instance("InputContext");
			context.Name = "gameplay";
			context.Parent = parent;

			const [, cancel] = core.subscribe(parent, "gameplay");

			expect(typeIs(cancel, "function")).toBeTrue();
		});

		it("should not destroy instances on unregister", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			const inputFolder = new Instance("Folder");
			inputFolder.Name = "input";
			inputFolder.Parent = parent;

			const context = new Instance("InputContext");
			context.Name = "gameplay";
			context.Parent = inputFolder;

			const [handle] = core.subscribe(parent, "gameplay");
			core.unregister(handle);

			expect(inputFolder.FindFirstChild("gameplay")).toBeDefined();
		});

		it("should auto-cancel listeners on unregister", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			const [handle, cancel] = core.subscribe(parent, "gameplay");
			core.unregister(handle);

			// cancel should be safe to call after unregister (no-op)
			expect(() => {
				cancel();
			}).never.toThrow();
		});

		it("should create context via addContext on subscribed handle", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");

			const [handle] = core.subscribe(parent, "gameplay");
			core.addContext(handle, "ui");

			expect(core.hasContext(handle, "ui")).toBeTrue();
		});

		it("should reuse server-created InputContext instead of creating a duplicate", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			// Server creates both gameplay and ui
			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay", "ui");

			// Client subscribes to gameplay only, then adds ui
			const [handle] = core.subscribe(parent, "gameplay");
			core.addContext(handle, "ui");

			const inputFolder = parent.FindFirstChild("input");
			assert(inputFolder);

			// Should be exactly one "ui" InputContext, not two
			const children = inputFolder.GetChildren().filter((child) => child.Name === "ui");

			expect(children.size()).toBe(1);
		});

		it("should create InputContext instance under input folder via addContext on subscribed handle", () => {
			expect.assertions(2);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");

			const [handle] = core.subscribe(parent, "gameplay");
			core.addContext(handle, "ui");

			const inputFolder = parent.FindFirstChild("input");
			assert(inputFolder);

			const uiContext = inputFolder.FindFirstChild("ui");

			expect(uiContext).toBeDefined();
			expect(classIs(uiContext!, "InputContext")).toBeTrue();
		});

		it("should return cancel from addContext on subscribed handle", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");

			const [handle] = core.subscribe(parent, "gameplay");
			const cancel = core.addContext(handle, "ui");

			expect(() => {
				cancel();
			}).never.toThrow();
		});

		it("should find context added after subscribe via ChildAdded", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			// Subscribe before server creates instances
			const [handle] = core.subscribe(parent, "gameplay");

			// Server creates instances after subscribe
			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");
			// First defer fires the folder ChildAdded, second fires the context
			// ChildAdded
			awaitDefer();
			awaitDefer();

			expect(core.hasContext(handle, "gameplay")).toBeTrue();
		});

		it("should re-enable context on re-add after remove on subscribed handle", () => {
			expect.assertions(2);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");

			const [handle] = core.subscribe(parent, "gameplay");
			core.addContext(handle, "ui");
			core.removeContext(handle, "ui");

			expect(core.hasContext(handle, "ui")).toBeFalse();

			core.addContext(handle, "ui");

			expect(core.hasContext(handle, "ui")).toBeTrue();
		});

		it("should create input folder via addContext when it does not yet exist", () => {
			expect.assertions(2);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			const [handle] = core.subscribe(parent, "gameplay");
			core.addContext(handle, "ui");

			const inputFolder = parent.FindFirstChild("input");

			expect(inputFolder).toBeDefined();

			const uiContext = inputFolder!.FindFirstChild("ui");

			expect(uiContext).toBeDefined();
		});

		it("should destroy dynamically-added instances on unregister for subscribed handle", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");

			const [handle] = core.subscribe(parent, "gameplay");
			core.addContext(handle, "ui");

			core.unregister(handle);

			const inputFolder = parent.FindFirstChild("input");
			assert(inputFolder);

			expect(inputFolder.FindFirstChild("ui")).toBeUndefined();
		});
	});

	describe("registerAs", () => {
		it("should set up requested contexts", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = fromPartial<InputHandle>(99);
			core.registerAs(handle, new Instance("Folder"), "gameplay", "ui");

			expect(core.hasContext(handle, "gameplay")).toBeTrue();
			expect(core.hasContext(handle, "ui")).toBeTrue();
		});

		it("should work with simulateAction and update", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = fromPartial<InputHandle>(7);
			core.registerAs(handle, new Instance("Folder"), "gameplay");
			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should clean up via unregister", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = fromPartial<InputHandle>(42);
			core.registerAs(handle, new Instance("Folder"), "gameplay");
			core.unregister(handle);
			const getState = () => {
				core.getState(handle);
			};

			expect(getState).toThrow("handle not registered");
		});

		it("should validate unknown context names", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = fromPartial<InputHandle>(42);
			const registerAs = () => {
				core.registerAs(handle, new Instance("Folder"), fromAny("nonexistent"));
			};

			expect(registerAs).toThrow("unknown context");
		});
	});

	describe("subscribeAs", () => {
		it("should subscribe with externally-provided handle", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");

			const handle = fromPartial<InputHandle>(42);
			core.subscribeAs(handle, parent, "gameplay");

			expect(core.hasContext(handle, "gameplay")).toBeTrue();
		});

		it("should validate unknown context names", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = fromPartial<InputHandle>(42);
			const subscribeAs = () => {
				core.subscribeAs(handle, new Instance("Folder"), fromAny("nonexistent"));
			};

			expect(subscribeAs).toThrow("unknown context");
		});
	});

	describe("subscribe + update", () => {
		it("should not throw when update is called before replication", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			core.subscribe(parent, "gameplay");

			expect(() => {
				core.update(0.016);
			}).never.toThrow();
		});

		it("should return default values for actions not yet replicated", () => {
			expect.assertions(2);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const [handle] = core.subscribe(parent, "gameplay");

			core.update(0.016);

			const state = core.getState(handle);

			expect(state.pressed("jump")).toBeFalse();
			expect(state.direction2d("move")).toBe(Vector2.zero);
		});

		it("should process action after instances replicate", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const [handle] = core.subscribe(parent, "gameplay");

			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");
			awaitDefer();
			awaitDefer();

			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should allow simulateAction before replication", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const [handle] = core.subscribe(parent, "gameplay");

			core.simulateAction(handle, "jump", true);
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should not retain stale state after simulateAction expires", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const [handle] = core.subscribe(parent, "gameplay");

			core.simulateAction(handle, "jump", true);
			core.update(0.016);
			// simulatedValues cleared after first update; next update should
			// reset
			core.update(0.016);

			expect(core.getState(handle).pressed("jump")).toBeFalse();
		});

		it("should call onReplicationTimeout after threshold", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const [mockWarn, mockWarnFunction] = jest.fn<void, [message: string]>();
			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
				onReplicationTimeout: mockWarnFunction,
			});

			core.subscribe(parent, "gameplay");

			for (const _ of $range(1, 313)) {
				core.update(0.016);
			}

			expect(mockWarn).toHaveBeenCalledWith(expect.any("string"));
		});

		it("should warn only once per action", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const [mockWarn, mockWarnFunction] = jest.fn<void, [message: string]>();
			const core = createCore({
				actions: { jump: { type: "Bool" as const } },
				contexts: {
					gameplay: { bindings: { jump: [Enum.KeyCode.Space] }, priority: 0 },
				},
				debug: true,
				onReplicationTimeout: mockWarnFunction,
			});

			core.subscribe(parent, "gameplay");

			for (const _ of $range(1, 625)) {
				core.update(0.016);
			}

			expect(mockWarn).toHaveBeenCalledOnce();
		});

		it("should not warn if action replicates before timeout", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const [mockWarn, mockWarnFunction] = jest.fn<void, [message: string]>();
			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
				onReplicationTimeout: mockWarnFunction,
			});

			core.subscribe(parent, "gameplay");
			core.update(0.016);
			core.update(0.016);

			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");
			awaitDefer();
			awaitDefer();

			for (const _ of $range(1, 625)) {
				core.update(0.016);
			}

			expect(mockWarn).never.toHaveBeenCalled();
		});

		it("should not warn when debug is false", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const [mockWarn, mockWarnFunction] = jest.fn<void, [message: string]>();
			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: false,
				onReplicationTimeout: mockWarnFunction,
			});

			core.subscribe(parent, "gameplay");

			for (const _ of $range(1, 625)) {
				core.update(0.016);
			}

			expect(mockWarn).never.toHaveBeenCalled();
		});

		it("should skip missing actions from addContext on subscribed handle", () => {
			expect.assertions(1);

			const parent = new Instance("Folder");
			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });

			const serverCore = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			serverCore.register(parent, "gameplay");

			const [handle] = core.subscribe(parent, "gameplay");
			core.addContext(handle, "ui");

			expect(() => {
				core.update(0.016);
			}).never.toThrow();
		});

		it("should warn via global warn when no callback is provided", () => {
			expect.assertions(1);

			const spy = jest.spyOn(jest.globalEnv, "warn");
			spy.mockImplementation(() => {});

			const parent = new Instance("Folder");
			const core = createCore({
				actions: { jump: { type: "Bool" as const } },
				contexts: {
					gameplay: { bindings: { jump: [Enum.KeyCode.Space] }, priority: 0 },
				},
				debug: true,
			});

			core.subscribe(parent, "gameplay");

			for (const _ of $range(1, 313)) {
				core.update(0.016);
			}

			const callCount = spy.mock.calls.size();
			const firstArgument = spy.mock.calls[0]![0];
			spy.mockRestore();

			assert(callCount > 0, "expected warn to be called");

			expect(firstArgument).toStrictEqual(expect.stringContaining("jump"));
		});
	});

	describe("getBindings", () => {
		it("should return default bindings when no overrides exist", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const bindings = core.getBindings(handle, "jump");

			expect(bindings).toContain(Enum.KeyCode.Space);
		});

		it("should return overridden bindings after rebind", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.rebind(handle, "jump", [Enum.KeyCode.F]);
			const bindings = core.getBindings(handle, "jump");

			expect(bindings).toContain(Enum.KeyCode.F);
			expect(bindings).never.toContain(Enum.KeyCode.Space);
		});

		it("should return default bindings after resetBindings", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.rebind(handle, "jump", [Enum.KeyCode.F]);
			core.resetBindings(handle, "jump");
			const bindings = core.getBindings(handle, "jump");

			expect(bindings).toContain(Enum.KeyCode.Space);
		});

		it("should scope to a single context when context is provided", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay", "ui");
			const gameplayBindings = core.getBindings(handle, "jump", "gameplay");
			const uiBindings = core.getBindings(handle, "jump", "ui");

			expect(gameplayBindings).toContain(Enum.KeyCode.Space);
			expect(uiBindings).toContain(Enum.KeyCode.Return);
		});

		it("should merge from all active contexts when no context is given", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay", "ui");
			const bindings = core.getBindings(handle, "jump");

			expect(bindings).toContain(Enum.KeyCode.Space);
			expect(bindings).toContain(Enum.KeyCode.Return);
		});

		it("should return empty array for action not in a specific context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay", "ui");
			const bindings = core.getBindings(handle, "move", "ui");

			expect(bindings).toHaveLength(0);
		});

		it("should throw HandleError for unregistered handle", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.unregister(handle);

			expect(() => {
				core.getBindings(handle, "jump");
			}).toThrowWithMessage(HandleError, RegExp("handle not registered"));
		});

		it("should deduplicate bindings shared across contexts", () => {
			expect.assertions(1);

			const sharedBinding = Enum.KeyCode.Space;
			const actions = { jump: { type: "Bool" as const } } satisfies ActionMap;
			const contexts = {
				a: {
					bindings: { jump: [sharedBinding] },
					priority: 0,
				},
				b: {
					bindings: { jump: [sharedBinding] },
					priority: 10,
				},
			} satisfies Record<string, ContextConfig>;
			const core = createCore({ actions, contexts });
			const handle = core.register(new Instance("Folder"), "a", "b");
			const bindings = core.getBindings(handle, "jump");

			expect(bindings).toHaveLength(1);
		});
	});

	describe("getAllBindings", () => {
		it("should return all actions with their effective bindings", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const all = core.getAllBindings(handle);

			expect(all.jump).toContain(Enum.KeyCode.Space);
			expect(all.move).toContain(Enum.KeyCode.W);
		});

		it("should reflect overrides for specific actions", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			core.rebind(handle, "jump", [Enum.KeyCode.F]);
			const all = core.getAllBindings(handle);

			expect(all.jump).toContain(Enum.KeyCode.F);
			expect(all.move).toContain(Enum.KeyCode.W);
		});

		it("should scope to a single context when context is provided", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay", "ui");
			const uiBindings = core.getAllBindings(handle, "ui");

			expect(uiBindings.jump).toContain(Enum.KeyCode.Return);
			expect(uiBindings.move).toHaveLength(0);
		});

		it("should return empty arrays for actions with no bindings in a context", () => {
			expect.assertions(1);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay", "ui");
			const uiBindings = core.getAllBindings(handle, "ui");

			expect(uiBindings.cursor).toHaveLength(0);
		});
	});
});
