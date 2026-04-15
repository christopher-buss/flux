import type { BindingLike } from "../types/bindings";

/** The input platform a binding targets. */
export type InputPlatform = "gamepad" | "keyboard" | "touch";

const GAMEPAD_KEYCODES = new Set<Enum.KeyCode>([
	Enum.KeyCode.ButtonA,
	Enum.KeyCode.ButtonB,
	Enum.KeyCode.ButtonL1,
	Enum.KeyCode.ButtonL2,
	Enum.KeyCode.ButtonL3,
	Enum.KeyCode.ButtonR1,
	Enum.KeyCode.ButtonR2,
	Enum.KeyCode.ButtonR3,
	Enum.KeyCode.ButtonSelect,
	Enum.KeyCode.ButtonStart,
	Enum.KeyCode.ButtonX,
	Enum.KeyCode.ButtonY,
	Enum.KeyCode.DPadDown,
	Enum.KeyCode.DPadLeft,
	Enum.KeyCode.DPadRight,
	Enum.KeyCode.DPadUp,
	Enum.KeyCode.Thumbstick1,
	Enum.KeyCode.Thumbstick2,
]);

/** Directional field names to check on binding config objects. */
const DIRECTIONAL_KEYS = ["up", "down", "left", "right", "forward", "backward"] as const;

/** Modifier field names to check on binding config objects. */
const MODIFIER_KEYS = ["primaryModifier", "secondaryModifier"] as const;

/**
 * Determines which input platform a binding targets.
 * @param binding - A raw KeyCode or binding config object.
 * @returns The input platform: `"gamepad"`, `"keyboard"`, or `"touch"`.
 * @example
 * classifyBinding(Enum.KeyCode.Space) // → "keyboard"
 * classifyBinding(Enum.KeyCode.ButtonA) // → "gamepad"
 * classifyBinding({ pointerIndex: 1 }) // → "touch"
 */
export function classifyBinding(binding: BindingLike): InputPlatform {
	if (typeIs(binding, "EnumItem")) {
		return classifyKeyCode(binding);
	}

	// Check directional keys (Direction1d/2d/3d configs).
	for (const key of DIRECTIONAL_KEYS) {
		const keyCode = (binding as Record<string, unknown>)[key] as Enum.KeyCode | undefined;
		if (keyCode !== undefined) {
			return classifyKeyCode(keyCode);
		}
	}

	// Check the keyCode field (Bool, ViewportPosition, etc.).
	const { keyCode } = binding as { keyCode?: Enum.KeyCode };
	if (keyCode !== undefined) {
		return classifyKeyCode(keyCode);
	}

	// Check modifier fields (primaryModifier, secondaryModifier).
	for (const key of MODIFIER_KEYS) {
		const modifier = (binding as Record<string, unknown>)[key] as Enum.KeyCode | undefined;
		if (modifier !== undefined) {
			return classifyKeyCode(modifier);
		}
	}

	return "touch";
}

/**
 * Filters bindings to only those targeting the given platform.
 * @param bindings - Array of bindings to filter.
 * @param platform - The target platform to match.
 * @returns A new array containing only bindings that match the platform.
 * @example
 * getBindingsForPlatform(
 *   [Enum.KeyCode.Space, Enum.KeyCode.ButtonA],
 *   "gamepad",
 * )
 * // → [Enum.KeyCode.ButtonA]
 */
export function getBindingsForPlatform(
	bindings: ReadonlyArray<BindingLike>,
	platform: InputPlatform,
): ReadonlyArray<BindingLike> {
	return bindings.filter((binding) => classifyBinding(binding) === platform);
}

/**
 * Classifies a KeyCode as gamepad or keyboard.
 * @param keyCode - The KeyCode to classify.
 * @returns The platform the KeyCode belongs to.
 */
function classifyKeyCode(keyCode: Enum.KeyCode): "gamepad" | "keyboard" {
	return GAMEPAD_KEYCODES.has(keyCode) ? "gamepad" : "keyboard";
}
