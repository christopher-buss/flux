import type { BindingConfig, BindingLike } from "../types/bindings";

/** Device-specific binding name for IAS instances. */
export type BindingClassName = "GamepadBinding" | "KeyboardBinding" | "TouchBinding";

/** KeyCode-bearing fields on binding configs, checked in priority order. */
const KEY_CODE_FIELDS = ["keyCode", "up", "down", "left", "right", "forward", "backward"] as const;

/**
 * Classifies a binding by device type.
 * @param bindingLike - A bare KeyCode or binding config object.
 * @returns The IAS binding instance name for the device.
 */
export function classifyBinding(bindingLike: BindingLike): BindingClassName {
	if (isKeyCode(bindingLike)) {
		return classifyKeyCode(bindingLike);
	}

	return classifyConfig(bindingLike);
}

function isGamepadKeyCode(keyCode: Enum.KeyCode): boolean {
	const name = keyCode.Name;
	return (
		name.sub(1, 6) === "Button" || name.sub(1, 4) === "DPad" || name.sub(1, 10) === "Thumbstick"
	);
}

function classifyKeyCode(keyCode: Enum.KeyCode): BindingClassName {
	if (keyCode === Enum.KeyCode.Touch) {
		return "TouchBinding";
	}

	if (isGamepadKeyCode(keyCode)) {
		return "GamepadBinding";
	}

	return "KeyboardBinding";
}

function classifyConfig(config: BindingConfig): BindingClassName {
	if ("pointerIndex" in config) {
		return "TouchBinding";
	}

	for (const field of KEY_CODE_FIELDS) {
		const value = config[field as keyof typeof config];
		if (value !== undefined && typeIs(value, "EnumItem") && value.EnumType === Enum.KeyCode) {
			return classifyKeyCode(value);
		}
	}

	return "KeyboardBinding";
}

function isKeyCode(value: BindingLike): value is Enum.KeyCode {
	return typeIs(value, "EnumItem") && value.EnumType === Enum.KeyCode;
}
