import type { BindingConfigKey, BindingLike } from "../types/bindings";

/** The input platform a binding targets. */
export type InputPlatform = "gamepad" | "keyboard" | "touch";

const GAMEPAD_KEYCODES = new Set<EnumItem>([
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
const DIRECTIONAL_KEYS = [
	"up",
	"down",
	"left",
	"right",
	"forward",
	"backward",
] satisfies ReadonlyArray<BindingConfigKey>;

/** Modifier field names to check on binding config objects. */
const MODIFIER_KEYS = [
	"primaryModifier",
	"secondaryModifier",
] satisfies ReadonlyArray<BindingConfigKey>;

/** Keyless field names that positively identify a touch binding. */
const TOUCH_KEYS = ["pointerIndex", "uiButton"] satisfies ReadonlyArray<BindingConfigKey>;

/**
 * Every field name that binds a config to an actual input, in classification
 * precedence order: directional keys, then `keyCode`, then modifiers, then the
 * keyless touch fields. A config carrying both a directional key and a
 * `keyCode` classifies by the directional key.
 */
const INPUT_SOURCE_KEYS = [
	...DIRECTIONAL_KEYS,
	"keyCode",
	...MODIFIER_KEYS,
	...TOUCH_KEYS,
] satisfies ReadonlyArray<BindingConfigKey>;

/**
 * Determines which input platform a binding targets.
 *
 * The first field set in `INPUT_SOURCE_KEYS` order decides: a config carrying
 * both a directional key and a `keyCode` classifies by the directional key, and
 * a key beats a `uiButton`. Touch is a positive determination made from
 * `pointerIndex` or `uiButton`, never from the absence of everything else.
 * @param binding - A raw KeyCode or binding config object.
 * @returns The input platform: `"gamepad"`, `"keyboard"`, or `"touch"`.
 * @remarks
 * Total and pure — a settings screen may call this over every binding without a
 * crash path.
 * @example
 * classifyBinding(Enum.KeyCode.Space) // → "keyboard"
 * classifyBinding(Enum.KeyCode.ButtonA) // → "gamepad"
 * classifyBinding({ pointerIndex: 1 }) // → "touch"
 */
export function classifyBinding(binding: BindingLike): InputPlatform {
	if (typeIs(binding, "EnumItem")) {
		return classifyKeyCode(binding);
	}

	for (const key of INPUT_SOURCE_KEYS) {
		const value = readConfigField(binding, key);
		if (value === undefined) {
			continue;
		}

		return typeIs(value, "EnumItem") ? classifyKeyCode(value) : "touch";
	}

	// A config with no input source is rejected by `createInputBinding`, so this
	// is unreachable for a constructed binding. Kept total so classification
	// never throws.
	return "keyboard";
}

/**
 * Reports whether a binding names any input the engine can fire on.
 *
 * A config is type-legal with every field omitted — `{ pressedThreshold: 0.5 }`
 * produces an `InputBinding` the engine accepts and never fires.
 * `createInputBinding` rejects such configs; classification never consults this.
 * @param binding - A raw KeyCode or binding config object.
 * @returns `true` if the binding sets a key, modifier, directional key,
 * `pointerIndex`, or `uiButton`.
 * @example
 * hasInputSource({ keyCode: Enum.KeyCode.Space }) // → true
 * hasInputSource({ pressedThreshold: 0.5 }) // → false
 */
export function hasInputSource(binding: BindingLike): boolean {
	if (typeIs(binding, "EnumItem")) {
		return true;
	}

	return INPUT_SOURCE_KEYS.some((key) => readConfigField(binding, key) !== undefined);
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
function classifyKeyCode(keyCode: EnumItem): "gamepad" | "keyboard" {
	return GAMEPAD_KEYCODES.has(keyCode) ? "gamepad" : "keyboard";
}

/**
 * Reads one optional field off a binding config by name.
 * @param config - The binding config to read from.
 * @param key - The field name to read.
 * @returns The field's value, or `undefined` when the field is unset.
 */
function readConfigField(
	config: Partial<Record<BindingConfigKey, unknown>>,
	key: BindingConfigKey,
): unknown {
	return config[key];
}
