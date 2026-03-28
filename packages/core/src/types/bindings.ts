import type { ActionMap, ActionType, AllActions } from "./actions";

/** Binding config for `"Bool"` actions. */
export interface BoolBindingConfig extends BaseBindingConfig {
	readonly pressedThreshold?: number;
	readonly releasedThreshold?: number;
	readonly uiButton?: GuiButton;
}

/** Binding config for `"Direction1D"` actions. */
export interface Direction1dBindingConfig extends DirectionalBindingConfig {
	readonly down?: Enum.KeyCode;
	readonly up?: Enum.KeyCode;
}

/** Binding config for `"Direction2D"` actions. */
export interface Direction2dBindingConfig extends DirectionalBindingConfig {
	readonly down?: Enum.KeyCode;
	readonly left?: Enum.KeyCode;
	readonly right?: Enum.KeyCode;
	readonly up?: Enum.KeyCode;
	readonly vector2Scale?: Vector2;
}

/** Binding config for `"Direction3D"` actions. */
export interface Direction3dBindingConfig extends DirectionalBindingConfig {
	readonly backward?: Enum.KeyCode;
	readonly down?: Enum.KeyCode;
	readonly forward?: Enum.KeyCode;
	readonly left?: Enum.KeyCode;
	readonly right?: Enum.KeyCode;
	readonly up?: Enum.KeyCode;
	readonly vector3Scale?: Vector3;
}

/** Binding config for `"ViewportPosition"` actions. */
export interface ViewportPositionBindingConfig extends BaseBindingConfig {
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
	readonly keyCode?: Enum.KeyCode;
	readonly primaryModifier?: Enum.KeyCode;
	readonly secondaryModifier?: Enum.KeyCode;
}

/** Shared properties for directional (1D/2D/3D) binding configs. */
interface DirectionalBindingConfig extends BaseBindingConfig {
	readonly clampMagnitudeToOne?: boolean;
	readonly responseCurve?: number;
	readonly scale?: number;
}
