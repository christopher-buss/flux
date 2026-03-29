import { describe, expect, it } from "@rbxts/jest-globals";

import {
	bool,
	createCore,
	defineActions,
	defineContexts,
	direction1d,
	direction2d,
	hold,
	implicit,
	scale,
} from "../../src";

const FRAME_TIME = 0.016;

describe("core lifecycle", () => {
	it("should flow from defineActions through getState query", () => {
		expect.assertions(2);

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
		});

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");

		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);

		const state = core.getState(handle);

		expect(state.pressed("jump")).toBeTrue();
		expect(state.triggered("jump")).toBeTrue();
	});

	it("should only fire actions from active contexts", () => {
		expect.assertions(2);

		const actions = defineActions({
			confirm: bool(),
			jump: bool(),
		});

		const contexts = defineContexts({
			gameplay: {
				bindings: { jump: [Enum.KeyCode.Space] },
				priority: 0,
			},
			menu: {
				bindings: { confirm: [Enum.KeyCode.Return] },
				priority: 10,
			},
		});

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay", "menu");

		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);

		expect(core.getState(handle).pressed("jump")).toBeTrue();

		core.removeContext(handle, "gameplay");
		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);

		expect(core.getState(handle).pressed("jump")).toBeFalse();
	});

	it("should block lower priority actions when sink is active", () => {
		expect.assertions(2);

		const actions = defineActions({
			confirm: bool(),
			jump: bool(),
		});

		const contexts = defineContexts({
			gameplay: {
				bindings: { jump: [Enum.KeyCode.Space] },
				priority: 0,
			},
			ui: {
				bindings: { confirm: [Enum.KeyCode.Return] },
				priority: 10,
				sink: true,
			},
		});

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay", "ui");

		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);

		expect(core.getState(handle).pressed("jump")).toBeFalse();

		core.simulateAction(handle, "confirm", true);
		core.update(FRAME_TIME);

		expect(core.getState(handle).pressed("confirm")).toBeTrue();
	});

	it("should maintain independent state per handle", () => {
		expect.assertions(2);

		const actions = defineActions({
			jump: bool(),
		});

		const contexts = defineContexts({
			gameplay: {
				bindings: { jump: [Enum.KeyCode.Space] },
				priority: 0,
			},
		});

		const core = createCore({ actions, contexts });
		const handle1 = core.register(new Instance("Folder"), "gameplay");
		const handle2 = core.register(new Instance("Folder"), "gameplay");

		core.simulateAction(handle1, "jump", true);
		core.update(FRAME_TIME);

		expect(core.getState(handle1).pressed("jump")).toBeTrue();
		expect(core.getState(handle2).pressed("jump")).toBeFalse();
	});

	it("should apply modifiers before trigger evaluation", () => {
		expect.assertions(1);

		const actions = defineActions({
			throttle: direction1d({ modifiers: [scale(2)] }),
		});

		const contexts = defineContexts({
			gameplay: {
				bindings: { throttle: [Enum.KeyCode.W] },
				priority: 0,
			},
		});

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");

		core.simulateAction(handle, "throttle", 0.5);
		core.update(FRAME_TIME);

		expect(core.getState(handle).axis1d("throttle")).toBeCloseTo(1);
	});

	it("should evaluate triggers with post-modifier magnitude", () => {
		expect.assertions(3);

		const actions = defineActions({
			fire: bool({
				triggers: [implicit(hold({ attempting: 0, threshold: 0.5 }))],
			}),
		});

		const contexts = defineContexts({
			gameplay: {
				bindings: { fire: [Enum.KeyCode.ButtonR2] },
				priority: 0,
			},
		});

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");

		core.simulateAction(handle, "fire", true);
		core.update(0.1);

		const earlyState = core.getState(handle);

		expect(earlyState.triggered("fire")).toBeFalse();
		expect(earlyState.ongoing("fire")).toBeTrue();

		core.simulateAction(handle, "fire", true);
		core.update(0.5);

		expect(core.getState(handle).triggered("fire")).toBeTrue();
	});
});
