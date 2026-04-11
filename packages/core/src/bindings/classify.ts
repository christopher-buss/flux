import type { BindingConfig, BindingLike } from "../types/bindings";

/**
 * Broad input platform categories for binding classification.
 */
export type InputPlatform = "gamepad" | "keyboard" | "touch";

/**
 * Gamepad KeyCodes used for platform classification.
 */
const GAMEPAD_KEYCODES = new Set<Enum.KeyCode>([
	Enum.KeyCode.ButtonA,
	Enum.KeyCode.ButtonB,
	Enum.KeyCode.ButtonX,
	Enum.KeyCode.ButtonY,
	Enum.KeyCode.ButtonL1,
	Enum.KeyCode.ButtonL2,
	Enum.KeyCode.ButtonL3,
	Enum.KeyCode.ButtonR1,
	Enum.KeyCode.ButtonR2,
	Enum.KeyCode.ButtonR3,
	Enum.KeyCode.ButtonSelect,
	Enum.KeyCode.ButtonStart,
	Enum.KeyCode.DPadDown,
	Enum.KeyCode.DPadLeft,
	Enum.KeyCode.DPadRight,
	Enum.KeyCode.DPadUp,
	Enum.KeyCode.Thumbstick1,
	Enum.KeyCode.Thumbstick2,
]);

/**
 * Touch-specific KeyCodes used for platform classification.
 */
const TOUCH_KEYCODES = new Set<Enum.KeyCode>([Enum.KeyCode.Touch]);

/**
 * Classifies a binding into a broad input platform category.
 *
 * @param binding - The binding to classify.
 * @returns The input platform the binding belongs to.
 */
export function classifyBinding(binding: BindingLike): InputPlatform {
	const keyCode = extractKeyCode(binding);
	if (keyCode === undefined) {
		return "keyboard";
	}

	if (GAMEPAD_KEYCODES.has(keyCode)) {
		return "gamepad";
	}

	if (TOUCH_KEYCODES.has(keyCode)) {
		return "touch";
	}

	return "keyboard";
}

/**
 * Filters an array of bindings to only those matching the given platform.
 *
 * @param bindings - The bindings to filter.
 * @param platform - The platform to filter by.
 * @returns A new array containing only bindings for the given platform.
 */
export function getBindingsForPlatform(
	bindings: ReadonlyArray<BindingLike>,
	platform: InputPlatform,
): ReadonlyArray<BindingLike> {
	return bindings.filter((binding) => classifyBinding(binding) === platform);
}

function isKeyCode(value: BindingLike): value is Enum.KeyCode {
	return typeIs(value, "EnumItem") && value.EnumType === Enum.KeyCode;
}

function extractKeyCode(binding: BindingLike): Enum.KeyCode | undefined {
	if (isKeyCode(binding)) {
		return binding;
	}

	return (binding as BindingConfig).keyCode;
}
