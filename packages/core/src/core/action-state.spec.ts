import { describe, expect, it } from "@rbxts/jest-globals";

import type { ActionMap } from "../types/actions";
import { getMagnitude } from "./action-entry";
import type { UpdateActionOptions } from "./action-state";
import { createActionState } from "./action-state";

const TEST_ACTIONS = {
	jump: { type: "Bool" as const },
	look: { type: "Direction3D" as const },
	move: { type: "Direction2D" as const },
	throttle: { type: "Direction1D" as const },
} satisfies ActionMap;

describe("createActionState", () => {
	describe("pressed", () => {
		it("should return true when triggerState is triggered", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.pressed("jump")).toBeTrue();
		});

		it("should return false when value is true but triggerState is ongoing", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});

			expect(state.pressed("jump")).toBeFalse();
		});
	});

	describe("justPressed", () => {
		it("should detect triggerState transition to triggered", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.justPressed("jump")).toBeTrue();

			internal.endFrame();
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.justPressed("jump")).toBeFalse();
		});

		it("should return false when value is true but triggerState is ongoing", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});

			expect(state.justPressed("jump")).toBeFalse();
		});

		it("should fire when triggerState transitions from ongoing to triggered", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});

			expect(state.justPressed("jump")).toBeFalse();

			internal.endFrame();
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.justPressed("jump")).toBeTrue();
		});
	});

	describe("justReleased", () => {
		it("should detect triggerState transition from triggered", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});
			internal.endFrame();
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "none",
				value: false,
			});

			expect(state.justReleased("jump")).toBeTrue();

			internal.endFrame();
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "none",
				value: false,
			});

			expect(state.justReleased("jump")).toBeFalse();
		});
	});

	describe("rawPressed", () => {
		it("should return true when raw value is true regardless of triggerState", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});

			expect(state.rawPressed("jump")).toBeTrue();
		});
	});

	describe("rawJustPressed", () => {
		it("should detect raw value transition false to true", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});

			expect(state.rawJustPressed("jump")).toBeTrue();

			internal.endFrame();
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});

			expect(state.rawJustPressed("jump")).toBeFalse();
		});
	});

	describe("direction2d", () => {
		it("should return the stored Vector2", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const direction = new Vector2(0.5, -0.3);
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: direction,
			});

			expect(state.direction2d("move").X).toBeCloseTo(0.5);
			expect(state.direction2d("move").Y).toBeCloseTo(-0.3);
		});
	});

	describe("axis1d", () => {
		it("should return the stored number", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "throttle",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: 0.75,
			});

			expect(state.axis1d("throttle")).toBe(0.75);
		});
	});

	describe("axis3d", () => {
		it("should return the stored Vector3", () => {
			expect.assertions(3);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const direction = new Vector3(1, 2, 3);
			internal.updateAction({
				action: "look",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: direction,
			});

			expect(state.axis3d("look").X).toBe(1);
			expect(state.axis3d("look").Y).toBe(2);
			expect(state.axis3d("look").Z).toBe(3);
		});
	});

	describe("triggered", () => {
		it("should return true when triggerState is triggered", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.triggered("jump")).toBeTrue();
		});
	});

	describe("ongoing", () => {
		it("should return true when triggerState is ongoing", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});

			expect(state.ongoing("jump")).toBeTrue();
		});
	});

	describe("canceled", () => {
		it("should return true when triggerState is canceled", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "canceled",
				value: true,
			});

			expect(state.canceled("jump")).toBeTrue();
		});
	});

	describe("claim", () => {
		it("should return true first time and set isClaimed", () => {
			expect.assertions(2);

			const [state] = createActionState(TEST_ACTIONS);

			expect(state.claim("jump")).toBeTrue();
			expect(state.isClaimed("jump")).toBeTrue();
		});

		it("should return false if already claimed", () => {
			expect.assertions(2);

			const [state] = createActionState(TEST_ACTIONS);
			state.claim("jump");

			expect(state.claim("jump")).toBeFalse();
			expect(state.isClaimed("jump")).toBeTrue();
		});
	});

	describe("isAvailable", () => {
		it("should be true when enabled and not claimed", () => {
			expect.assertions(1);

			const [state] = createActionState(TEST_ACTIONS);

			expect(state.isAvailable("jump")).toBeTrue();
		});

		it("should be false when disabled", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.setEnabled("jump", false);

			expect(state.isAvailable("jump")).toBeFalse();
		});
	});

	describe("isEnabled", () => {
		it("should default to true", () => {
			expect.assertions(1);

			const [state] = createActionState(TEST_ACTIONS);

			expect(state.isEnabled("jump")).toBeTrue();
		});

		it("should respect config.enabled", () => {
			expect.assertions(1);

			const [state] = createActionState({
				jump: { enabled: false, type: "Bool" as const },
			});

			expect(state.isEnabled("jump")).toBeFalse();
		});
	});

	describe("endFrame", () => {
		it("should shift current to previous so justPressed becomes false", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.justPressed("jump")).toBeTrue();

			internal.endFrame();

			expect(state.justPressed("jump")).toBeFalse();
		});

		it("should reset claimed flags", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			state.claim("jump");

			expect(state.isClaimed("jump")).toBeTrue();

			internal.endFrame();

			expect(state.isClaimed("jump")).toBeFalse();
		});
	});

	describe("currentDuration", () => {
		it("should return accumulated duration", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.currentDuration("jump")).toBeCloseTo(0.032);
		});
	});

	describe("previousDuration", () => {
		it("should return previous trigger state duration", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.previousDuration("jump")).toBeCloseTo(0.032);
		});
	});

	describe("axisBecameActive", () => {
		it("should detect Direction2D magnitude 0 to greater than 0", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector2(1, 0),
			});

			expect(state.axisBecameActive("move")).toBeTrue();
		});

		it("should detect Direction1D magnitude 0 to greater than 0", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "throttle",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: 0.5,
			});

			expect(state.axisBecameActive("throttle")).toBeTrue();
		});

		it("should detect Direction3D magnitude 0 to greater than 0", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "look",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector3(1, 0, 0),
			});

			expect(state.axisBecameActive("look")).toBeTrue();
		});
	});

	describe("axisBecameInactive", () => {
		it("should detect magnitude greater than 0 to 0 transition", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector2(1, 0),
			});
			internal.endFrame();
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "none",
				value: Vector2.zero,
			});

			expect(state.axisBecameInactive("move")).toBeTrue();
		});
	});

	describe("getState", () => {
		it("should return the current value", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.getState("jump")).toBeTrue();
		});
	});

	describe("position2d", () => {
		it("should return the stored Vector2", () => {
			expect.assertions(2);

			const actions = {
				cursor: { type: "ViewportPosition" as const },
			};
			const [state, internal] = createActionState(actions);
			const position = new Vector2(100, 200);
			internal.updateAction({
				action: "cursor",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: position,
			});

			expect(state.position2d("cursor").X).toBe(100);
			expect(state.position2d("cursor").Y).toBe(200);
		});
	});

	describe("claim-aware reads", () => {
		it("should suppress pressed and triggered", () => {
			expect.assertions(4);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.pressed("jump")).toBeTrue();
			expect(state.triggered("jump")).toBeTrue();

			state.claim("jump");

			expect(state.pressed("jump")).toBeFalse();
			expect(state.triggered("jump")).toBeFalse();
		});

		it("should suppress justPressed", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.justPressed("jump")).toBeTrue();

			state.claim("jump");

			expect(state.justPressed("jump")).toBeFalse();
		});

		it("should suppress justReleased", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});
			internal.endFrame();
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "none",
				value: false,
			});

			expect(state.justReleased("jump")).toBeTrue();

			state.claim("jump");

			expect(state.justReleased("jump")).toBeFalse();
		});

		it("should suppress ongoing", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});

			expect(state.ongoing("jump")).toBeTrue();

			state.claim("jump");

			expect(state.ongoing("jump")).toBeFalse();
		});

		it("should suppress canceled", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "canceled",
				value: false,
			});

			expect(state.canceled("jump")).toBeTrue();

			state.claim("jump");

			expect(state.canceled("jump")).toBeFalse();
		});

		it("should suppress axisBecameActive", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector2(1, 0),
			});

			expect(state.axisBecameActive("move")).toBeTrue();

			state.claim("move");

			expect(state.axisBecameActive("move")).toBeFalse();
		});

		it("should suppress axisBecameInactive", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector2(1, 0),
			});
			internal.endFrame();
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "none",
				value: Vector2.zero,
			});

			expect(state.axisBecameInactive("move")).toBeTrue();

			state.claim("move");

			expect(state.axisBecameInactive("move")).toBeFalse();
		});

		it("should return neutral false for a claimed Bool getState", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.getState("jump")).toBeTrue();

			state.claim("jump");

			expect(state.getState("jump")).toBeFalse();
		});

		it("should return the neutral vector for a claimed Direction2D getState", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector2(1, 0),
			});

			expect(state.getState("move")).toBe(new Vector2(1, 0));

			state.claim("move");

			expect(state.getState("move")).toBe(Vector2.zero);
		});

		it("should return neutral 0 for a claimed axis1d", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "throttle",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: 0.5,
			});

			expect(state.axis1d("throttle")).toBeCloseTo(0.5);

			state.claim("throttle");

			expect(state.axis1d("throttle")).toBe(0);
		});

		it("should return neutral zero vector for a claimed direction2d", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector2(1, 0),
			});

			expect(state.direction2d("move")).toBe(new Vector2(1, 0));

			state.claim("move");

			expect(state.direction2d("move")).toBe(Vector2.zero);
		});

		it("should return neutral zero vector for a claimed axis3d", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "look",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector3(1, 0, 0),
			});

			expect(state.axis3d("look")).toBe(new Vector3(1, 0, 0));

			state.claim("look");

			expect(state.axis3d("look")).toBe(Vector3.zero);
		});

		it("should return neutral zero vector for a claimed position2d", () => {
			expect.assertions(2);

			const [state, internal] = createActionState({
				cursor: { type: "ViewportPosition" as const },
			});
			internal.updateAction({
				action: "cursor",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector2(100, 200),
			});

			expect(state.position2d("cursor")).toBe(new Vector2(100, 200));

			state.claim("cursor");

			expect(state.position2d("cursor")).toBe(Vector2.zero);
		});

		it("should return zero durations while claimed", () => {
			expect.assertions(4);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.currentDuration("jump")).toBeCloseTo(0.016);
			expect(state.previousDuration("jump")).toBeCloseTo(0.016);

			state.claim("jump");

			expect(state.currentDuration("jump")).toBe(0);
			expect(state.previousDuration("jump")).toBe(0);
		});

		it("should not suppress rawPressed or rawJustPressed", () => {
			expect.assertions(4);

			const [state, internal] = createActionState(TEST_ACTIONS);
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.rawPressed("jump")).toBeTrue();
			expect(state.rawJustPressed("jump")).toBeTrue();

			state.claim("jump");

			expect(state.rawPressed("jump")).toBeTrue();
			expect(state.rawJustPressed("jump")).toBeTrue();
		});

		it("should not suppress isClaimed or isEnabled", () => {
			expect.assertions(3);

			const [state] = createActionState(TEST_ACTIONS);
			state.claim("jump");

			expect(state.isClaimed("jump")).toBeTrue();
			expect(state.isEnabled("jump")).toBeTrue();
			expect(state.isAvailable("jump")).toBeFalse();
		});
	});

	describe("capture", () => {
		/**
		 * A frame with the button physically held and the trigger firing.
		 * @returns Update options for a held, triggered frame.
		 */
		function pressedJumpFrame(): UpdateActionOptions {
			return {
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			};
		}

		/**
		 * A tap-style frame: the trigger fires on the frame the value returns
		 * to zero, so a release during it is clean — no in-flight press.
		 * @returns Update options for a triggered, zero-magnitude frame.
		 */
		function tappedJumpFrame(): UpdateActionOptions {
			return {
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: false,
			};
		}

		/**
		 * A frame with the button fully released and the trigger idle.
		 * @returns Update options for an idle, zero-magnitude frame.
		 */
		function releasedJumpFrame(): UpdateActionOptions {
			return {
				action: "jump",
				deltaTime: 0.016,
				triggerState: "none",
				value: false,
			};
		}

		it("should let the holder read pressed and triggered while others read false", () => {
			expect.assertions(4);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(token.pressed()).toBeTrue();
			expect(token.triggered()).toBeTrue();
			expect(state.pressed("jump")).toBeFalse();
			expect(state.triggered("jump")).toBeFalse();
		});

		it("should let the holder read justPressed while others read false", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(token.justPressed()).toBeTrue();
			expect(state.justPressed("jump")).toBeFalse();
		});

		it("should let the holder read justReleased while others read false", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});
			internal.endFrame();
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "none",
				value: false,
			});

			expect(token.justReleased()).toBeTrue();
			expect(state.justReleased("jump")).toBeFalse();
		});

		it("should let the holder read ongoing while others read false", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});

			expect(token.ongoing()).toBeTrue();
			expect(state.ongoing("jump")).toBeFalse();
		});

		it("should let the holder read canceled while others read false", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "canceled",
				value: false,
			});

			expect(token.canceled()).toBeTrue();
			expect(state.canceled("jump")).toBeFalse();
		});

		it("should let the holder read axisBecameActive while others read false", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("move");
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector2(1, 0),
			});

			expect(token.axisBecameActive()).toBeTrue();
			expect(state.axisBecameActive("move")).toBeFalse();
		});

		it("should let the holder read axisBecameInactive while others read false", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("move");
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector2(1, 0),
			});
			internal.endFrame();
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "none",
				value: Vector2.zero,
			});

			expect(token.axisBecameInactive()).toBeTrue();
			expect(state.axisBecameInactive("move")).toBeFalse();
		});

		it("should let the holder read axis1d while others read neutral 0", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("throttle");
			internal.updateAction({
				action: "throttle",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: 0.75,
			});

			expect(token.axis1d()).toBeCloseTo(0.75);
			expect(state.axis1d("throttle")).toBe(0);
		});

		it("should let the holder read direction2d while others read the neutral vector", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("move");
			internal.updateAction({
				action: "move",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector2(1, 0),
			});

			expect(token.direction2d()).toBe(new Vector2(1, 0));
			expect(state.direction2d("move")).toBe(Vector2.zero);
		});

		it("should let the holder read axis3d while others read the neutral vector", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("look");
			internal.updateAction({
				action: "look",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector3(1, 2, 3),
			});

			expect(token.axis3d()).toBe(new Vector3(1, 2, 3));
			expect(state.axis3d("look")).toBe(Vector3.zero);
		});

		it("should let the holder read position2d while others read the neutral vector", () => {
			expect.assertions(2);

			const [state, internal] = createActionState({
				cursor: { type: "ViewportPosition" as const },
			});
			const token = state.capture("cursor");
			internal.updateAction({
				action: "cursor",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: new Vector2(100, 200),
			});

			expect(token.position2d()).toBe(new Vector2(100, 200));
			expect(state.position2d("cursor")).toBe(Vector2.zero);
		});

		it("should let the holder read getState while others read neutral", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(token.getState()).toBeTrue();
			expect(state.getState("jump")).toBeFalse();
		});

		it("should let the holder read durations while others read 0", () => {
			expect.assertions(4);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "ongoing",
				value: true,
			});
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(token.currentDuration()).toBeCloseTo(0.016);
			expect(token.previousDuration()).toBeCloseTo(0.016);
			expect(state.currentDuration("jump")).toBe(0);
			expect(state.previousDuration("jump")).toBe(0);
		});

		it("should not suppress rawPressed or rawJustPressed while captured", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			state.capture("jump");
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.rawPressed("jump")).toBeTrue();
			expect(state.rawJustPressed("jump")).toBeTrue();
		});

		it("should keep the hold across endFrame until released", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});
			internal.endFrame();
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(token.pressed()).toBeTrue();
			expect(state.pressed("jump")).toBeFalse();
		});

		it("should restore normal reads on a clean release", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			// A tap-style trigger fires on the frame the value returns to
			// zero, so the release below is clean — no in-flight press to
			// drain.
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: false,
			});

			expect(state.pressed("jump")).toBeFalse();

			token.release();

			expect(state.pressed("jump")).toBeTrue();
		});

		it("should treat double release as a no-op", () => {
			expect.assertions(1);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			token.release();
			token.release();
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.pressed("jump")).toBeTrue();
		});

		it("should let the holder claim within the session", () => {
			expect.assertions(4);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(token.claim()).toBeTrue();
			expect(state.isClaimed("jump")).toBeTrue();

			// The claim carries no owner identity, so it blinds the holder too.
			expect(token.pressed()).toBeFalse();

			expect(token.claim()).toBeFalse();
		});

		it("should keep the capture after a claim clears at endFrame", () => {
			expect.assertions(3);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			token.claim();
			internal.endFrame();
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
			});

			expect(state.isClaimed("jump")).toBeFalse();
			expect(token.pressed()).toBeTrue();
			expect(state.pressed("jump")).toBeFalse();
		});

		// Restore-on-release reads here use clean releases (magnitude already
		// zero). Releasing mid-press starts a drain instead — see the
		// "release drain" suite for that contract.
		describe("lifo stacking", () => {
			it("should let a second capture succeed and shadow the first", () => {
				expect.assertions(2);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const first = state.capture("jump");
				const second = state.capture("jump");
				internal.updateAction(pressedJumpFrame());

				expect(second.pressed()).toBeTrue();
				expect(first.pressed()).toBeFalse();
			});

			it("should let shadowed tokens read trigger and edge reads as inert", () => {
				expect.assertions(5);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const first = state.capture("jump");
				state.capture("jump");
				internal.updateAction(pressedJumpFrame());

				expect(first.pressed()).toBeFalse();
				expect(first.triggered()).toBeFalse();
				expect(first.justPressed()).toBeFalse();
				expect(first.ongoing()).toBeFalse();
				expect(first.justReleased()).toBeFalse();
			});

			it("should let shadowed tokens read values and durations as inert", () => {
				expect.assertions(4);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const first = state.capture("jump");
				state.capture("jump");
				internal.updateAction({
					action: "jump",
					deltaTime: 0.016,
					triggerState: "ongoing",
					value: true,
				});
				internal.updateAction(pressedJumpFrame());

				expect(first.getState()).toBeFalse();
				expect(first.currentDuration()).toBe(0);
				expect(first.previousDuration()).toBe(0);
				expect(first.canceled()).toBeFalse();
			});

			it("should let only the top holder read real state", () => {
				expect.assertions(4);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const first = state.capture("jump");
				const second = state.capture("jump");
				const third = state.capture("jump");
				internal.updateAction(pressedJumpFrame());

				expect(third.pressed()).toBeTrue();
				expect(second.pressed()).toBeFalse();
				expect(first.pressed()).toBeFalse();
				expect(state.pressed("jump")).toBeFalse();
			});

			it("should restore the next holder in the same frame when the top releases cleanly", () => {
				expect.assertions(3);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const first = state.capture("jump");
				const second = state.capture("jump");
				internal.updateAction(tappedJumpFrame());

				expect(first.pressed()).toBeFalse();

				second.release();

				// No endFrame or update between release and read: same frame.
				expect(first.pressed()).toBeTrue();

				// The action stays owned throughout — no unowned frame.
				expect(state.pressed("jump")).toBeFalse();
			});

			it("should keep the restored holder across the next frame boundary", () => {
				expect.assertions(2);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const first = state.capture("jump");
				const second = state.capture("jump");
				internal.updateAction(tappedJumpFrame());
				second.release();
				internal.endFrame();
				internal.updateAction(pressedJumpFrame());

				expect(first.pressed()).toBeTrue();
				expect(state.pressed("jump")).toBeFalse();
			});

			it("should remove an out-of-order release silently, leaving the top holder unaffected", () => {
				expect.assertions(3);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const first = state.capture("jump");
				const second = state.capture("jump");
				internal.updateAction(pressedJumpFrame());

				first.release();

				expect(second.pressed()).toBeTrue();
				expect(state.pressed("jump")).toBeFalse();

				// The top's own mid-press release drains instead of reading
				// through.
				second.release();

				expect(state.pressed("jump")).toBeFalse();
			});

			it("should treat double release of the top as a no-op that spares the holder beneath", () => {
				expect.assertions(3);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const first = state.capture("jump");
				const second = state.capture("jump");
				internal.updateAction(tappedJumpFrame());

				second.release();
				second.release();

				expect(first.pressed()).toBeTrue();
				expect(state.pressed("jump")).toBeFalse();

				first.release();

				expect(state.pressed("jump")).toBeTrue();
			});

			it("should return an independent token from each capture call", () => {
				expect.assertions(3);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const first = state.capture("jump");
				const second = state.capture("jump");
				internal.updateAction(tappedJumpFrame());

				expect(first).never.toBe(second);

				// Each token holds its own stack slot; both must release before
				// the action is restored.
				first.release();

				expect(state.pressed("jump")).toBeFalse();

				second.release();

				expect(state.pressed("jump")).toBeTrue();
			});
		});

		describe("release drain", () => {
			it("should suppress capture-aware reads after a mid-press release until magnitude reaches zero", () => {
				expect.assertions(5);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const token = state.capture("jump");
				internal.updateAction(pressedJumpFrame());

				token.release();

				// Same frame: the in-flight press stays suppressed — for the
				// released token too.
				expect(state.pressed("jump")).toBeFalse();
				expect(state.justPressed("jump")).toBeFalse();
				expect(token.pressed()).toBeFalse();

				// Next frame, still physically held: still suppressed.
				internal.endFrame();
				internal.updateAction(pressedJumpFrame());

				expect(state.pressed("jump")).toBeFalse();

				// The drain covers the frame magnitude reaches zero, so the
				// trailing release edge never leaks either.
				internal.endFrame();
				internal.updateAction(releasedJumpFrame());

				expect(state.justReleased("jump")).toBeFalse();
			});

			it("should restore normal reads once the drain settles", () => {
				expect.assertions(2);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const token = state.capture("jump");
				internal.updateAction(pressedJumpFrame());
				token.release();
				internal.endFrame();
				internal.updateAction(releasedJumpFrame());

				// The drain settles at the zero-magnitude frame boundary; a
				// fresh press reads normally.
				internal.endFrame();
				internal.updateAction(pressedJumpFrame());

				expect(state.pressed("jump")).toBeTrue();
				expect(state.justPressed("jump")).toBeTrue();
			});

			it("should keep draining while a custom trigger leaves triggered but the value is non-zero", () => {
				expect.assertions(4);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const token = state.capture("jump");
				internal.updateAction(pressedJumpFrame());

				token.release();
				internal.endFrame();

				// A custom hold/tap/combo trigger can drop out of
				// "triggered" while the button is still physically down; the
				// drain terminates on magnitude, not trigger state.
				internal.updateAction({
					action: "jump",
					deltaTime: 0.016,
					triggerState: "none",
					value: true,
				});

				expect(state.pressed("jump")).toBeFalse();

				// The trigger re-fires while the button is still down: the
				// press must not re-leak.
				internal.endFrame();
				internal.updateAction(pressedJumpFrame());

				expect(state.pressed("jump")).toBeFalse();
				expect(state.justPressed("jump")).toBeFalse();

				// Only the value reaching zero ends the drain.
				internal.endFrame();
				internal.updateAction(releasedJumpFrame());
				internal.endFrame();
				internal.updateAction(pressedJumpFrame());

				expect(state.pressed("jump")).toBeTrue();
			});

			it("should let raw reads see through the drain", () => {
				expect.assertions(3);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const token = state.capture("jump");
				internal.updateAction(pressedJumpFrame());

				token.release();

				expect(state.rawPressed("jump")).toBeTrue();
				expect(state.rawJustPressed("jump")).toBeTrue();

				internal.endFrame();
				internal.updateAction(pressedJumpFrame());

				expect(state.rawPressed("jump")).toBeTrue();
			});

			it("should let a capture acquired mid-drain read through immediately", () => {
				expect.assertions(3);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const token = state.capture("jump");
				internal.updateAction(pressedJumpFrame());

				token.release();

				// The entity taking ownership at the boundary is precisely
				// who should see in-flight state.
				const successor = state.capture("jump");

				expect(successor.pressed()).toBeTrue();
				expect(successor.getState()).toBeTrue();
				expect(state.pressed("jump")).toBeFalse();
			});

			it("should start a fresh drain when a mid-drain capture releases while the press is live", () => {
				expect.assertions(3);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const token = state.capture("jump");
				internal.updateAction(pressedJumpFrame());

				token.release();

				const successor = state.capture("jump");
				successor.release();

				expect(state.pressed("jump")).toBeFalse();

				internal.endFrame();
				internal.updateAction(pressedJumpFrame());

				expect(state.pressed("jump")).toBeFalse();

				// One zero-magnitude frame boundary settles the whole drain.
				internal.endFrame();
				internal.updateAction(releasedJumpFrame());
				internal.endFrame();
				internal.updateAction(pressedJumpFrame());

				expect(state.pressed("jump")).toBeTrue();
			});

			it("should drain for a holder restored by a stack pop rather than synthesizing a press", () => {
				expect.assertions(4);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const first = state.capture("jump");
				const second = state.capture("jump");
				internal.updateAction(pressedJumpFrame());

				second.release();

				// The restored holder sits beneath the drain — it never sees
				// the in-flight press.
				expect(first.pressed()).toBeFalse();
				expect(first.justPressed()).toBeFalse();

				internal.endFrame();
				internal.updateAction(pressedJumpFrame());

				expect(first.pressed()).toBeFalse();

				internal.endFrame();
				internal.updateAction(releasedJumpFrame());

				expect(first.justReleased()).toBeFalse();
			});

			it("should hand the restored holder fresh input once the drain settles", () => {
				expect.assertions(2);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const first = state.capture("jump");
				const second = state.capture("jump");
				internal.updateAction(pressedJumpFrame());
				second.release();
				internal.endFrame();
				internal.updateAction(releasedJumpFrame());

				// A fresh press after the drain reads normally, still owned
				// by the restored holder.
				internal.endFrame();
				internal.updateAction(pressedJumpFrame());

				expect(first.justPressed()).toBeTrue();
				expect(state.pressed("jump")).toBeFalse();
			});

			it("should terminate the drain for axis actions when the dead zone zeroes the value", () => {
				expect.assertions(4);

				const [state, internal] = createActionState(TEST_ACTIONS);
				const token = state.capture("move");
				internal.updateAction({
					action: "move",
					deltaTime: 0.016,
					triggerState: "triggered",
					value: new Vector2(1, 0),
				});

				token.release();

				expect(state.direction2d("move")).toBe(Vector2.zero);

				// The dead zone zeroes sub-threshold values before the
				// pipeline, so the drain sees an exact zero magnitude.
				internal.endFrame();
				internal.updateAction({
					action: "move",
					deltaTime: 0.016,
					triggerState: "none",
					value: Vector2.zero,
				});

				expect(state.axisBecameInactive("move")).toBeFalse();

				internal.endFrame();
				internal.updateAction({
					action: "move",
					deltaTime: 0.016,
					triggerState: "triggered",
					value: new Vector2(0, 1),
				});

				expect(state.direction2d("move")).toBe(new Vector2(0, 1));
				expect(state.axisBecameActive("move")).toBeTrue();
			});
		});
	});

	describe("getMagnitude", () => {
		it("should return 1 for true and 0 for false", () => {
			expect.assertions(2);

			expect(getMagnitude(true)).toBe(1);
			expect(getMagnitude(false)).toBe(0);
		});

		it("should return absolute value for numbers", () => {
			expect.assertions(2);

			expect(getMagnitude(-0.5)).toBeCloseTo(0.5);
			expect(getMagnitude(0.75)).toBeCloseTo(0.75);
		});
	});
});
