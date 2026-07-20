import type { BindingConfigKey, BindingLike } from "../types/bindings";

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

/**
 * Field names holding a KeyCode, in the order classification consults them:
 * directional keys, then the primary key, then modifiers.
 */
const KEYCODE_KEYS = [
	"up",
	"down",
	"left",
	"right",
	"forward",
	"backward",
	"keyCode",
	"primaryModifier",
	"secondaryModifier",
] as const;

/** Field names that only a touch binding carries. */
const TOUCH_KEYS = ["pointerIndex", "uiButton"] as const;

/**
 * Every field naming an input the engine fires on. The remaining
 * `BindingConfig` fields only tune how an input is read.
 */
const INPUT_SOURCE_KEYS = [
	...KEYCODE_KEYS,
	...TOUCH_KEYS,
] as const satisfies ReadonlyArray<BindingConfigKey>;

/**
 * Determines which input platform a binding targets.
 *
 * Touch is a positive determination made from `pointerIndex` or `uiButton`,
 * the two keyless shapes that are genuinely touch — never a fallback. A config
 * carrying no input source at all is rejected by `createInputBinding`, so it
 * cannot reach a running binding; this function still answers for one rather
 * than throwing, because a settings screen must be able to classify every
 * binding it holds without a crash path.
 * @param binding - A raw KeyCode or binding config object.
 * @returns The input platform: `"gamepad"`, `"keyboard"`, or `"touch"`. A
 * config with no input source reports `"keyboard"` — an arbitrary but stable
 * answer for a binding that `createInputBinding` refuses to build.
 * @example
 * classifyBinding(Enum.KeyCode.Space) // → "keyboard"
 * classifyBinding(Enum.KeyCode.ButtonA) // → "gamepad"
 * classifyBinding({ pointerIndex: 1 }) // → "touch"
 */
export function classifyBinding(binding: BindingLike): InputPlatform {
	if (typeIs(binding, "EnumItem")) {
		return classifyKeyCode(binding);
	}

	const config = binding as Record<string, unknown>;

	for (const key of KEYCODE_KEYS) {
		const keyCode = config[key] as Enum.KeyCode | undefined;
		if (keyCode !== undefined) {
			return classifyKeyCode(keyCode);
		}
	}

	for (const key of TOUCH_KEYS) {
		if (config[key] !== undefined) {
			return "touch";
		}
	}

	return "keyboard";
}

/**
 * Reports whether a binding names any input the engine can fire on.
 *
 * A config with no keycode, directional key, modifier or touch field is
 * type-legal but binds nothing, so `createInputBinding` rejects it.
 * @param binding - A raw KeyCode or binding config object.
 * @returns `true` when the binding carries at least one input source.
 * @example
 * hasInputSource({ keyCode: Enum.KeyCode.Space }) // → true
 * hasInputSource({ pressedThreshold: 0.5 }) // → false
 */
export function hasInputSource(binding: BindingLike): boolean {
	if (typeIs(binding, "EnumItem")) {
		return true;
	}

	const config = binding as Record<string, unknown>;
	for (const key of INPUT_SOURCE_KEYS) {
		if (config[key] !== undefined) {
			return true;
		}
	}

	return false;
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
