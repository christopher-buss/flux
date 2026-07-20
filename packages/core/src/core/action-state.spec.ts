import { describe, expect, it } from "@rbxts/jest-globals";

import type { ActionMap } from "../types/actions";
import { createActionState, getMagnitude } from "./action-state";

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

		it("should restore normal reads on release", () => {
			expect.assertions(2);

			const [state, internal] = createActionState(TEST_ACTIONS);
			const token = state.capture("jump");
			internal.updateAction({
				action: "jump",
				deltaTime: 0.016,
				triggerState: "triggered",
				value: true,
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
