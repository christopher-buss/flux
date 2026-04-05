import { describe, expect, it } from "@rbxts/jest-globals";

import { classifyBinding } from "./classify-binding";

describe("classifyBinding", () => {
	describe("bare KeyCode", () => {
		it("should return GamepadBinding for gamepad buttons", () => {
			expect.assertions(1);

			expect(classifyBinding(Enum.KeyCode.ButtonA)).toBe("GamepadBinding");
		});

		it("should return KeyboardBinding for keyboard keys", () => {
			expect.assertions(1);

			expect(classifyBinding(Enum.KeyCode.Space)).toBe("KeyboardBinding");
		});

		it("should return KeyboardBinding for mouse buttons", () => {
			expect.assertions(1);

			expect(classifyBinding(Enum.KeyCode.MouseLeftButton)).toBe("KeyboardBinding");
		});

		it("should return GamepadBinding for thumbstick keys", () => {
			expect.assertions(1);

			expect(classifyBinding(Enum.KeyCode.Thumbstick1)).toBe("GamepadBinding");
		});

		it("should return GamepadBinding for DPad keys", () => {
			expect.assertions(1);

			expect(classifyBinding(Enum.KeyCode.DPadUp)).toBe("GamepadBinding");
		});

		it("should return TouchBinding for Touch keycode", () => {
			expect.assertions(1);

			expect(classifyBinding(Enum.KeyCode.Touch)).toBe("TouchBinding");
		});

		it("should return KeyboardBinding for Unknown keycode", () => {
			expect.assertions(1);

			expect(classifyBinding(Enum.KeyCode.Unknown)).toBe("KeyboardBinding");
		});
	});

	describe("binding config", () => {
		it("should return TouchBinding when pointerIndex is set", () => {
			expect.assertions(1);

			expect(classifyBinding({ pointerIndex: 0 })).toBe("TouchBinding");
		});

		it("should return GamepadBinding when keyCode is a gamepad key", () => {
			expect.assertions(1);

			expect(classifyBinding({ keyCode: Enum.KeyCode.ButtonA })).toBe("GamepadBinding");
		});

		it("should return KeyboardBinding when keyCode is a keyboard key", () => {
			expect.assertions(1);

			expect(classifyBinding({ keyCode: Enum.KeyCode.E })).toBe("KeyboardBinding");
		});

		it("should return GamepadBinding when directional keys are gamepad keys", () => {
			expect.assertions(1);

			expect(
				classifyBinding({
					down: Enum.KeyCode.Thumbstick1,
					up: Enum.KeyCode.Thumbstick1,
				}),
			).toBe("GamepadBinding");
		});

		it("should return KeyboardBinding when no keyCode is present", () => {
			expect.assertions(1);

			expect(classifyBinding({ pressedThreshold: 0.5 })).toBe("KeyboardBinding");
		});

		it("should skip non-KeyCode fields when classifying", () => {
			expect.assertions(1);

			expect(
				classifyBinding({
					clampMagnitudeToOne: true,
					up: Enum.KeyCode.ButtonA,
				}),
			).toBe("GamepadBinding");
		});
	});
});
