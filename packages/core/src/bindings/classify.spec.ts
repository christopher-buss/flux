import { describe, expect, it } from "@rbxts/jest-globals";
import { fromAny } from "@rbxts/jest-utils";

import type {
	BoolBindingConfig,
	Direction2dBindingConfig,
	ViewportPositionBindingConfig,
} from "../types/bindings";
import {
	classifyBinding,
	filterBindingsByPlatform,
	hasInputSource,
	isInputPlatform,
} from "./classify";

describe("classifyBinding", () => {
	it("should classify a keyboard KeyCode as keyboard", () => {
		expect.assertions(1);

		expect(classifyBinding(Enum.KeyCode.Space)).toBe("keyboard");
	});

	it("should classify a gamepad button KeyCode as gamepad", () => {
		expect.assertions(1);

		expect(classifyBinding(Enum.KeyCode.ButtonA)).toBe("gamepad");
	});

	it("should classify a thumbstick KeyCode as gamepad", () => {
		expect.assertions(1);

		expect(classifyBinding(Enum.KeyCode.Thumbstick1)).toBe("gamepad");
	});

	it("should classify a DPad KeyCode as gamepad", () => {
		expect.assertions(1);

		expect(classifyBinding(Enum.KeyCode.DPadUp)).toBe("gamepad");
	});

	it("should classify a Direction2dBindingConfig with WASD keys as keyboard", () => {
		expect.assertions(1);

		const config: Direction2dBindingConfig = {
			down: Enum.KeyCode.S,
			left: Enum.KeyCode.A,
			right: Enum.KeyCode.D,
			up: Enum.KeyCode.W,
		};

		expect(classifyBinding(config)).toBe("keyboard");
	});

	it("should classify a Direction2dBindingConfig with DPad keys as gamepad", () => {
		expect.assertions(1);

		const config: Direction2dBindingConfig = {
			down: Enum.KeyCode.DPadDown,
			left: Enum.KeyCode.DPadLeft,
			right: Enum.KeyCode.DPadRight,
			up: Enum.KeyCode.DPadUp,
		};

		expect(classifyBinding(config)).toBe("gamepad");
	});

	it("should classify a BoolBindingConfig by its keyCode field", () => {
		expect.assertions(1);

		const config: BoolBindingConfig = {
			keyCode: Enum.KeyCode.ButtonX,
		};

		expect(classifyBinding(config)).toBe("gamepad");
	});

	it("should classify a config with only primaryModifier by its modifier", () => {
		expect.assertions(1);

		const config: BoolBindingConfig = {
			primaryModifier: Enum.KeyCode.LeftShift,
		};

		expect(classifyBinding(config)).toBe("keyboard");
	});

	it("should classify a config with only secondaryModifier by its modifier", () => {
		expect.assertions(1);

		const config: BoolBindingConfig = {
			secondaryModifier: Enum.KeyCode.ButtonR1,
		};

		expect(classifyBinding(config)).toBe("gamepad");
	});

	it("should classify a config with only pointerIndex as touch", () => {
		expect.assertions(1);

		const config: ViewportPositionBindingConfig = {
			pointerIndex: 1,
		};

		expect(classifyBinding(config)).toBe("touch");
	});

	it("should classify a config with only uiButton as touch", () => {
		expect.assertions(1);

		const config: BoolBindingConfig = {
			uiButton: new Instance("TextButton"),
		};

		expect(classifyBinding(config)).toBe("touch");
	});

	it("should prefer a directional key over keyCode", () => {
		expect.assertions(1);

		const config: Direction2dBindingConfig = {
			keyCode: Enum.KeyCode.Space,
			up: Enum.KeyCode.DPadUp,
		};

		expect(classifyBinding(config)).toBe("gamepad");
	});

	it("should prefer keyCode over a touch field", () => {
		expect.assertions(1);

		const config: BoolBindingConfig = {
			keyCode: Enum.KeyCode.Space,
			uiButton: new Instance("TextButton"),
		};

		expect(classifyBinding(config)).toBe("keyboard");
	});

	it("should classify a config with no input source as keyboard", () => {
		expect.assertions(1);

		const config: BoolBindingConfig = {
			pressedThreshold: 0.5,
		};

		expect(classifyBinding(config)).toBe("keyboard");
	});

	it("should ignore a keycode field holding something other than a KeyCode", () => {
		expect.assertions(1);

		const config: BoolBindingConfig = fromAny({
			keyCode: Enum.UserInputType.MouseButton1,
			uiButton: new Instance("TextButton"),
		});

		expect(classifyBinding(config)).toBe("touch");
	});

	it("should classify a config whose only keycode field is not a KeyCode as keyboard", () => {
		expect.assertions(1);

		const config: BoolBindingConfig = fromAny({
			keyCode: Enum.UserInputType.MouseButton1,
		});

		expect(classifyBinding(config)).toBe("keyboard");
	});
});

describe("hasInputSource", () => {
	it("should accept a config naming a KeyCode", () => {
		expect.assertions(1);

		expect(hasInputSource({ keyCode: Enum.KeyCode.Space })).toBeTrue();
	});

	it("should accept a raw KeyCode", () => {
		expect.assertions(1);

		expect(hasInputSource(Enum.KeyCode.Space)).toBeTrue();
	});

	it("should accept a config naming only a touch field", () => {
		expect.assertions(1);

		expect(hasInputSource({ pointerIndex: 1 })).toBeTrue();
	});

	it("should reject a config naming no input source", () => {
		expect.assertions(1);

		expect(hasInputSource({ pressedThreshold: 0.5 })).toBeFalse();
	});

	it("should reject a keycode field holding something other than a KeyCode", () => {
		expect.assertions(1);

		const config: BoolBindingConfig = fromAny({
			keyCode: Enum.UserInputType.MouseButton1,
		});

		expect(hasInputSource(config)).toBeFalse();
	});
});

describe("isInputPlatform", () => {
	it("should accept every platform literal", () => {
		expect.assertions(3);

		expect(isInputPlatform("gamepad")).toBeTrue();
		expect(isInputPlatform("keyboard")).toBeTrue();
		expect(isInputPlatform("touch")).toBeTrue();
	});

	it("should reject a string that is not a platform", () => {
		expect.assertions(1);

		expect(isInputPlatform("jump")).toBeFalse();
	});

	it("should reject a non-string value", () => {
		expect.assertions(1);

		expect(isInputPlatform(Enum.KeyCode.Space)).toBeFalse();
	});
});

describe("filterBindingsByPlatform", () => {
	it("should filter bindings to only those matching the platform", () => {
		expect.assertions(2);

		const bindings = [
			Enum.KeyCode.Space,
			Enum.KeyCode.ButtonA,
			Enum.KeyCode.W,
			Enum.KeyCode.DPadUp,
		];

		const result = filterBindingsByPlatform(bindings, "gamepad");

		expect(result.size()).toBe(2);
		expect(result[0]).toBe(Enum.KeyCode.ButtonA);
	});

	it("should return an empty array when no bindings match", () => {
		expect.assertions(1);

		const bindings = [Enum.KeyCode.Space, Enum.KeyCode.W];

		const result = filterBindingsByPlatform(bindings, "gamepad");

		expect(result.size()).toBe(0);
	});
});
