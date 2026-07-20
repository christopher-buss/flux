import { hasInputSource, isKeyCode } from "../bindings/classify";
import type { BindingConfigKey, BindingLike } from "../types/bindings";

type BindingProperty = WritablePropertyNames<InputBinding>;

const PROPERTY_MAP = {
	backward: "Backward",
	clampMagnitudeToOne: "ClampMagnitudeToOne",
	down: "Down",
	forward: "Forward",
	keyCode: "KeyCode",
	left: "Left",
	pointerIndex: "PointerIndex",
	pressedThreshold: "PressedThreshold",
	primaryModifier: "PrimaryModifier",
	releasedThreshold: "ReleasedThreshold",
	responseCurve: "ResponseCurve",
	right: "Right",
	scale: "Scale",
	secondaryModifier: "SecondaryModifier",
	uiButton: "UIButton",
	up: "Up",
	vector2Scale: "Vector2Scale",
	vector3Scale: "Vector3Scale",
} as const satisfies Record<BindingConfigKey, BindingProperty>;

/**
 * Throws if a binding cannot be built into an `InputBinding`, without creating
 * one.
 *
 * The same guards {@link createInputBinding} applies, split out so a rebind can
 * validate a whole incoming array before it destroys the action's existing
 * instances — a rejected binding must leave state untouched rather than tear
 * down the old bindings and then fail to build their replacements.
 * @param bindingLike - The binding definition to check.
 * @param actionName - The action the binding targets, named in the error.
 * @throws If a raw `Enum.UserInputType` is passed, or if the binding names no
 * input source at all.
 */
export function assertValidBinding(bindingLike: BindingLike, actionName: string): void {
	if (isUserInputType(bindingLike)) {
		error(`UserInputType bindings are not supported: ${bindingLike}. Use Enum.KeyCode instead`);
	}

	if (!hasInputSource(bindingLike)) {
		error(
			`Binding for action "${actionName}" has no input source. Set a keyCode, ` +
				"a directional key, a modifier, pointerIndex or uiButton",
		);
	}
}

/**
 * Creates a single `InputBinding` child on the given `InputAction`.
 * @param bindingLike - The binding definition (KeyCode or config object).
 * @param parent - The `InputAction` to parent the binding under.
 * @param instances - Bulk cleanup array the new instance is appended to.
 * @throws If a raw `Enum.UserInputType` is passed, or if the binding names no
 * input source at all.
 */
export function createInputBinding(
	bindingLike: BindingLike,
	parent: InputAction,
	instances: Array<Instance>,
): void {
	assertValidBinding(bindingLike, parent.Name);

	const binding = new Instance("InputBinding");
	if (isKeyCode(bindingLike)) {
		binding.KeyCode = bindingLike;
	} else {
		for (const [key, value] of pairs(bindingLike)) {
			binding[PROPERTY_MAP[key]] = value;
		}
	}

	binding.Parent = parent;
	instances.push(binding);
}

/**
 * Throws if any binding in the array cannot be built, without creating any.
 * @param bindings - The binding definitions to check.
 * @param actionName - The action the bindings target, named in the error.
 * @throws If any binding is a raw `Enum.UserInputType` or names no input source.
 */
export function assertValidBindings(
	bindings: ReadonlyArray<BindingLike>,
	actionName: string,
): void {
	for (const bindingLike of bindings) {
		assertValidBinding(bindingLike, actionName);
	}
}

/**
 * Creates every `InputBinding` child for one action.
 * @param bindings - The binding definitions to create.
 * @param parent - The `InputAction` to parent the bindings under.
 * @param instances - Bulk cleanup array the new instances are appended to.
 */
export function createBindingsForAction(
	bindings: ReadonlyArray<BindingLike>,
	parent: InputAction,
	instances: Array<Instance>,
): void {
	for (const bindingLike of bindings) {
		createInputBinding(bindingLike, parent, instances);
	}
}

function isUserInputType(value: unknown): boolean {
	return typeIs(value, "EnumItem") && value.EnumType === Enum.UserInputType;
}
