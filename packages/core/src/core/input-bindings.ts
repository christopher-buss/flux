import { hasInputSource } from "../bindings/classify";
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
 * Creates a single `InputBinding` child on the given `InputAction`.
 * @param bindingLike - The binding definition (KeyCode or config object).
 * @param parent - The `InputAction` to parent the binding under.
 * @param instances - Bulk cleanup array the new instance is appended to.
 * @throws If a raw `Enum.UserInputType` is passed.
 * @throws If the config carries no input source, so the binding could never
 * fire.
 */
export function createInputBinding(
	bindingLike: BindingLike,
	parent: InputAction,
	instances: Array<Instance>,
): void {
	if (isUserInputType(bindingLike)) {
		error(`UserInputType bindings are not supported: ${bindingLike}. Use Enum.KeyCode instead`);
	}

	if (!hasInputSource(bindingLike)) {
		error(
			`Binding for action "${parent.Name}" has no input source. Set a keyCode, a ` +
				"directional key, a modifier, pointerIndex, or uiButton",
		);
	}

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

function isKeyCode(value: BindingLike): value is Enum.KeyCode {
	return typeIs(value, "EnumItem") && value.EnumType === Enum.KeyCode;
}

function isUserInputType(value: unknown): boolean {
	return typeIs(value, "EnumItem") && value.EnumType === Enum.UserInputType;
}
