import { describe, expect, it } from "@rbxts/jest-globals";

import {
	bool,
	createCore,
	defineActions,
	defineContexts,
	direction2d,
	hold,
	implicit,
} from "../../src";

const FRAME_TIME = 0.016;

describe("frame transitions", () => {
	it("should detect justPressed after update", () => {
		expect.assertions(1);

		const actions = defineActions({ jump: bool() });
		const contexts = defineContexts({
			gameplay: {
				bindings: { jump: [Enum.KeyCode.Space] },
				priority: 0,
			},
		});

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);

		expect(core.getState(handle).justPressed("jump")).toBeTrue();
	});

	it("should not detect justPressed on second frame when held", () => {
		expect.assertions(1);

		const actions = defineActions({ jump: bool() });
		const contexts = defineContexts({
			gameplay: {
				bindings: { jump: [Enum.KeyCode.Space] },
				priority: 0,
			},
		});

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);
		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);

		expect(core.getState(handle).justPressed("jump")).toBeFalse();
	});

	it("should detect justReleased after update", () => {
		expect.assertions(1);

		const actions = defineActions({ jump: bool() });
		const contexts = defineContexts({
			gameplay: {
				bindings: { jump: [Enum.KeyCode.Space] },
				priority: 0,
			},
		});

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);
		core.update(FRAME_TIME);

		expect(core.getState(handle).justReleased("jump")).toBeTrue();
	});

	it("should not detect justPressed during hold trigger ongoing phase", () => {
		expect.assertions(2);

		const actions = defineActions({
			jump: bool({
				triggers: [implicit(hold({ attempting: 0, threshold: 0.5 }))],
			}),
		});
		const contexts = defineContexts({
			gameplay: {
				bindings: { jump: [Enum.KeyCode.Space] },
				priority: 0,
			},
		});

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.simulateAction(handle, "jump", true);
		core.update(0.1);

		expect(core.getState(handle).justPressed("jump")).toBeFalse();

		core.simulateAction(handle, "jump", true);
		core.update(0.5);

		expect(core.getState(handle).justPressed("jump")).toBeTrue();
	});

	it("should detect axisBecameActive after update", () => {
		expect.assertions(1);

		const actions = defineActions({ move: direction2d() });
		const contexts = defineContexts({
			gameplay: {
				bindings: { move: [Enum.KeyCode.W] },
				priority: 0,
			},
		});

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.simulateAction(handle, "move", new Vector2(1, 0));
		core.update(FRAME_TIME);

		expect(core.getState(handle).axisBecameActive("move")).toBeTrue();
	});

	it("should detect axisBecameInactive after update", () => {
		expect.assertions(1);

		const actions = defineActions({ move: direction2d() });
		const contexts = defineContexts({
			gameplay: {
				bindings: { move: [Enum.KeyCode.W] },
				priority: 0,
			},
		});

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.simulateAction(handle, "move", new Vector2(1, 0));
		core.update(FRAME_TIME);
		core.update(FRAME_TIME);

		expect(core.getState(handle).axisBecameInactive("move")).toBeTrue();
	});
});
