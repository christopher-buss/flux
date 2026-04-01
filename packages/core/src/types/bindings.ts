import type { ActionMap, ActionType, AllActions } from "./actions";

/** Binding config for `"Bool"` actions. */
export interface BoolBindingConfig extends BaseBindingConfig {
	/**
	 * Analog value at or above which the action counts as pressed.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#PressedThreshold
	 */
	readonly pressedThreshold?: number;
	/**
	 * Analog value at or below which the action counts as released.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#ReleasedThreshold
	 */
	readonly releasedThreshold?: number;
	/**
	 * GUI button that activates this action when clicked.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#UIButton
	 */
	readonly uiButton?: GuiButton;
}

/** Binding config for `"Direction1D"` actions. */
export interface Direction1dBindingConfig extends DirectionalBindingConfig {
	/**
	 * Key that maps to the negative direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Down
	 */
	readonly down?: Enum.KeyCode;
	/**
	 * Key that maps to the positive direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Up
	 */
	readonly up?: Enum.KeyCode;
}

/** Binding config for `"Direction2D"` actions. */
export interface Direction2dBindingConfig extends DirectionalBindingConfig {
	/**
	 * Key that maps to the negative Y direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Down
	 */
	readonly down?: Enum.KeyCode;
	/**
	 * Key that maps to the negative X direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Left
	 */
	readonly left?: Enum.KeyCode;
	/**
	 * Key that maps to the positive X direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Right
	 */
	readonly right?: Enum.KeyCode;
	/**
	 * Key that maps to the positive Y direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Up
	 */
	readonly up?: Enum.KeyCode;
	/**
	 * Multiplier applied to the final 2D vector.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Vector2Scale
	 */
	readonly vector2Scale?: Vector2;
}

/** Binding config for `"Direction3D"` actions. */
export interface Direction3dBindingConfig extends DirectionalBindingConfig {
	/**
	 * Key that maps to the negative Z direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Backward
	 */
	readonly backward?: Enum.KeyCode;
	/**
	 * Key that maps to the negative Y direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Down
	 */
	readonly down?: Enum.KeyCode;
	/**
	 * Key that maps to the positive Z direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Forward
	 */
	readonly forward?: Enum.KeyCode;
	/**
	 * Key that maps to the negative X direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Left
	 */
	readonly left?: Enum.KeyCode;
	/**
	 * Key that maps to the positive X direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Right
	 */
	readonly right?: Enum.KeyCode;
	/**
	 * Key that maps to the positive Y direction.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Up
	 */
	readonly up?: Enum.KeyCode;
	/**
	 * Multiplier applied to the final 3D vector.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Vector3Scale
	 */
	readonly vector3Scale?: Vector3;
}

/** Binding config for `"ViewportPosition"` actions. */
export interface ViewportPositionBindingConfig extends BaseBindingConfig {
	/**
	 * Which pointer to track when multiple touch points are active.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#PointerIndex
	 */
	readonly pointerIndex?: number;
}

/** Union of all binding config shapes. */
export type BindingConfig =
	| BoolBindingConfig
	| Direction1dBindingConfig
	| Direction2dBindingConfig
	| Direction3dBindingConfig
	| ViewportPositionBindingConfig;

/**
 * Resolves the accepted binding types for a given action type.
 * @template T - The action type literal.
 */
export type BindingForAction<T extends ActionType> = T extends "Bool"
	? BoolBindingConfig | Enum.KeyCode | Enum.UserInputType
	: T extends "Direction1D"
		? Direction1dBindingConfig | Enum.KeyCode | Enum.UserInputType
		: T extends "Direction2D"
			? Direction2dBindingConfig | Enum.KeyCode | Enum.UserInputType
			: T extends "Direction3D"
				? Direction3dBindingConfig | Enum.KeyCode | Enum.UserInputType
				: T extends "ViewportPosition"
					? Enum.KeyCode | Enum.UserInputType | ViewportPositionBindingConfig
					: never;

/** A binding-like value: KeyCode, UserInputType, or typed binding config. */
export type BindingLike = BindingConfig | Enum.KeyCode | Enum.UserInputType;

/**
 * Maps action names to correctly-typed binding arrays.
 * @template Actions - The action map defining available action names.
 */
export type TypedBindings<Actions extends ActionMap> = {
	readonly [K in keyof Actions & string]?: ReadonlyArray<BindingForAction<Actions[K]["type"]>>;
};

/**
 * Maps action names to their bound inputs. Used for serialization and rebinding.
 * @template Actions - The action map defining available action names.
 */
export type BindingState<Actions extends ActionMap = ActionMap> = Partial<
	Record<AllActions<Actions>, ReadonlyArray<BindingLike>>
>;

/** Shared properties available on every binding config. */
interface BaseBindingConfig {
	/**
	 * Primary key or button for this binding.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#KeyCode
	 */
	readonly keyCode?: Enum.KeyCode;
	/**
	 * Key that must be held alongside the primary key.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#PrimaryModifier
	 */
	readonly primaryModifier?: Enum.KeyCode;
	/**
	 * Second modifier key that must be held alongside the primary key.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#SecondaryModifier
	 */
	readonly secondaryModifier?: Enum.KeyCode;
}

/** Shared properties for directional (1D/2D/3D) binding configs. */
interface DirectionalBindingConfig extends BaseBindingConfig {
	/**
	 * Whether to normalize the output vector to unit length.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#ClampMagnitudeToOne
	 */
	readonly clampMagnitudeToOne?: boolean;
	/**
	 * Exponent applied to the input magnitude for non-linear response.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#ResponseCurve
	 */
	readonly responseCurve?: number;
	/**
	 * Uniform scalar multiplier applied to the output value.
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputBinding#Scale
	 */
	readonly scale?: number;
}
