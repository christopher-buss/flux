import type { BindingConfigKey, BindingLike } from "../types/bindings";

/** The input platform a binding targets. */
export type InputPlatform = "gamepad" | "keyboard" | "touch";

/**
 * A binding config read field-by-field rather than as one of its union members.
 *
 * Every `BindingConfig` shape satisfies this structurally, which lets the
 * classification loops index a key that only some members declare without
 * asserting the config's type.
 */
type BindingFields = Readonly<Partial<Record<BindingConfigKey, unknown>>>;

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
] as const satisfies ReadonlyArray<BindingConfigKey>;

/** Field names that only a touch binding carries. */
const TOUCH_KEYS = ["pointerIndex", "uiButton"] as const satisfies ReadonlyArray<BindingConfigKey>;

/**
 * The `BindingConfig` fields that are neither scanned as an input source nor
 * accounted for as tuning — `never` while the buckets cover the config surface.
 *
 * The `satisfies ReadonlyArray<BindingConfigKey>` on the scan tuples is a
 * subset check: it catches a renamed or removed field but says nothing about
 * coverage, so a newly added source field would leave {@link hasInputSource}
 * reporting `false` for a valid binding. A new field lands here instead, and
 * fails the assertion below until it is deliberately routed to a bucket.
 */
export type UnclaimedBindingKey = Exclude<
	BindingConfigKey,
	(typeof KEYCODE_KEYS)[number] | (typeof TOUCH_KEYS)[number] | TuningKey
>;

/**
 * Fails to compile while {@link UnclaimedBindingKey} is inhabited.
 *
 * Exported only so the assertion is not dead code to the linter; it is not
 * re-exported from the package index.
 */
export type BindingKeysAreClaimed = AssertClaimed<UnclaimedBindingKey>;

/**
 * Field names that shape what an input source produces rather than naming one.
 *
 * A type rather than a tuple because nothing reads these at runtime: they exist
 * to account for the half of `BindingConfigKey` that {@link findPlatform} is
 * right to skip, so {@link UnclaimedBindingKey} can hold the two halves to the
 * whole.
 */
type TuningKey =
	| "clampMagnitudeToOne"
	| "pressedThreshold"
	| "releasedThreshold"
	| "responseCurve"
	| "scale"
	| "vector2Scale"
	| "vector3Scale";

/**
 * Rejects any `BindingConfig` field that no bucket claims.
 * @template T - The keys left over by the buckets.
 */
type AssertClaimed<T extends never> = T;

/**
 * Narrows an unknown value to a `KeyCode`.
 *
 * Checks `EnumType` rather than trusting that any `EnumItem` is a `KeyCode`,
 * so a `UserInputType` or a value from a deserialized save is rejected.
 * @param value - The value to test.
 * @returns `true` when the value is an `Enum.KeyCode`.
 * @example
 * isKeyCode(Enum.KeyCode.Space) // → true
 * isKeyCode(Enum.UserInputType.MouseButton1) // → false
 */
export function isKeyCode(value: unknown): value is Enum.KeyCode {
	return typeIs(value, "EnumItem") && value.EnumType === Enum.KeyCode;
}

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
	return findPlatform(binding) ?? "keyboard";
}

/**
 * Reports whether a binding names any input the engine can fire on.
 *
 * A config with no keycode, directional key, modifier or touch field is
 * type-legal but binds nothing, so `createInputBinding` rejects it.
 *
 * "Present" means exactly what {@link classifyBinding} means by it — both read
 * the same scan — so a keycode field holding something that is not a `KeyCode`
 * counts as absent here rather than passing this guard only to classify
 * through the sourceless fallback.
 * @param binding - A raw KeyCode or binding config object.
 * @returns `true` when the binding carries at least one input source.
 * @example
 * hasInputSource({ keyCode: Enum.KeyCode.Space }) // → true
 * hasInputSource({ pressedThreshold: 0.5 }) // → false
 */
export function hasInputSource(binding: BindingLike): boolean {
	return findPlatform(binding) !== undefined;
}

/**
 * Filters bindings to only those classifying to the given platform.
 *
 * Classification, not storage: this asks what each binding *is*, so it answers
 * for any list — a context's declared bindings, a deserialized save. Reading
 * what a player bound on one platform's row is `FluxCore.getBindingsForPlatform`
 * instead, which reads the stored bucket and so keeps a binding on the row the
 * player put it on.
 * @param bindings - Array of bindings to filter.
 * @param platform - The target platform to match.
 * @returns A new array containing only bindings that match the platform.
 * @example
 * filterBindingsByPlatform(
 *   [Enum.KeyCode.Space, Enum.KeyCode.ButtonA],
 *   "gamepad",
 * )
 * // → [Enum.KeyCode.ButtonA]
 */
export function filterBindingsByPlatform(
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

/**
 * Finds the platform a binding names an input source for.
 *
 * The single scan both {@link classifyBinding} and {@link hasInputSource} are
 * defined in terms of, so the two cannot disagree about whether a field counts
 * as present. Keycode fields are consulted first, in
 * {@link KEYCODE_KEYS} order, then the touch-only fields.
 * @param binding - A raw KeyCode or binding config object.
 * @returns The platform named, or `undefined` when the binding names no input
 * source the engine can fire on.
 */
function findPlatform(binding: BindingLike): InputPlatform | undefined {
	if (typeIs(binding, "EnumItem")) {
		return classifyKeyCode(binding);
	}

	const config: BindingFields = binding;

	for (const key of KEYCODE_KEYS) {
		const keyCode = config[key];
		if (isKeyCode(keyCode)) {
			return classifyKeyCode(keyCode);
		}
	}

	for (const key of TOUCH_KEYS) {
		if (config[key] !== undefined) {
			return "touch";
		}
	}

	return undefined;
}
