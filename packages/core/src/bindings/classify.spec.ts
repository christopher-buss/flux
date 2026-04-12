import { describe, expect, it } from "@rbxts/jest-globals";

import type {
	BoolBindingConfig,
	Direction2dBindingConfig,
	ViewportPositionBindingConfig,
} from "../types/bindings";
import { classifyBinding, getBindingsForPlatform } from "./classify";

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

	it("should classify a config with no keyCode or directional keys as touch", () => {
		expect.assertions(1);

		const config: ViewportPositionBindingConfig = {
			pointerIndex: 1,
		};

		expect(classifyBinding(config)).toBe("touch");
	});
});

describe("getBindingsForPlatform", () => {
	it("should filter bindings to only those matching the platform", () => {
		expect.assertions(2);

		const bindings = [
			Enum.KeyCode.Space,
			Enum.KeyCode.ButtonA,
			Enum.KeyCode.W,
			Enum.KeyCode.DPadUp,
		];

		const result = getBindingsForPlatform(bindings, "gamepad");

		expect(result.size()).toBe(2);
		expect(result[0]).toBe(Enum.KeyCode.ButtonA);
	});

	it("should return an empty array when no bindings match", () => {
		expect.assertions(1);

		const bindings = [Enum.KeyCode.Space, Enum.KeyCode.W];

		const result = getBindingsForPlatform(bindings, "gamepad");

		expect(result.size()).toBe(0);
	});
});
