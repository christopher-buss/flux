import type { ActionState } from "@rbxts/flux";
import { bool, createCore, defineActions, defineContexts } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";

const FRAME_TIME = 0.016;

const actions = defineActions({ jump: bool() });
const contexts = defineContexts({
	gameplay: {
		bindings: { jump: [Enum.KeyCode.Space] },
		priority: 0,
	},
});

/**
 * The read-then-claim idiom a consumer runs each frame.
 * @param state - The action state to arbitrate over.
 * @returns True if this consumer read the press and won the claim.
 */
function didConsumeJump(state: ActionState<typeof actions>): boolean {
	return state.justPressed("jump") && state.claim("jump");
}

describe("claim arbitration", () => {
	it("should let the first consumer win and leave the second inert", () => {
		expect.assertions(3);

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);

		const state = core.getState(handle);
		const didFirstConsume = didConsumeJump(state);
		const didSecondConsume = didConsumeJump(state);

		expect(didFirstConsume).toBeTrue();
		expect(didSecondConsume).toBeFalse();
		expect(state.pressed("jump")).toBeFalse();
	});

	it("should make the action readable again on the next frame", () => {
		expect.assertions(2);

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);

		const state = core.getState(handle);
		state.claim("jump");

		expect(state.pressed("jump")).toBeFalse();

		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);

		expect(state.pressed("jump")).toBeTrue();
	});

	it("should wipe a claim made before update", () => {
		expect.assertions(2);

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const state = core.getState(handle);
		state.claim("jump");

		expect(state.isClaimed("jump")).toBeTrue();

		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);

		expect(state.isClaimed("jump")).toBeFalse();
	});

	it("should show an unclaimed release frame after a claimed press frame", () => {
		expect.assertions(2);

		const core = createCore({ actions, contexts });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);

		const state = core.getState(handle);
		state.claim("jump");

		expect(state.justPressed("jump")).toBeFalse();

		core.update(FRAME_TIME);

		expect(state.justReleased("jump")).toBeTrue();
	});
});
