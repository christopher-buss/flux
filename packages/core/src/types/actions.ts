import type { Modifier } from "../modifiers/types";
import type { TypedTrigger } from "../triggers/types";

/**
 * Roblox-aligned action types mapping to `InputAction.Type`.
 *
 * - `"Bool"` — on/off actions (jump, fire)
 * - `"Direction1D"` — single-axis input (throttle)
 * - `"Direction2D"` — dual-axis input (movement)
 * - `"Direction3D"` — triple-axis input (spatial movement)
 * - `"ViewportPosition"` — screen-space position (cursor, touch).
 *
 * @see https://create.roblox.com/docs/reference/engine/enums/InputActionType
 */
export type ActionType =
	| "Bool"
	| "Direction1D"
	| "Direction2D"
	| "Direction3D"
	| "ViewportPosition";

/**
 * Configuration for a single input action.
 * @template T - The action type literal.
 */
export interface ActionConfig<T extends ActionType = ActionType> {
	/** Human-readable description of the action's purpose. */
	readonly description?: string;
	/**
	 * Whether the action is enabled.
	 * @default true
	 */
	readonly enabled?: boolean;
	/** Stateless value transforms applied before triggers. */
	readonly modifiers?: ReadonlyArray<Modifier>;
	/** Stateful gates that determine when the action fires. */
	readonly triggers?: ReadonlyArray<TypedTrigger>;
	/** The input value type this action produces. */
	readonly type: T;
}

/** A record mapping action names to their configurations. */
export type ActionMap = Record<string, ActionConfig>;

/**
 * Extracts action names typed as `"Bool"` from an action map.
 * @template T - The action map to filter.
 */
export type BoolActions<T extends ActionMap> = string &
	{
		[K in keyof T]: T[K] extends ActionConfig<"Bool"> ? K : never;
	}[keyof T];

/**
 * Extracts action names typed as `"Direction1D"` from an action map.
 * @template T - The action map to filter.
 */
export type Direction1dActions<T extends ActionMap> = string &
	{
		[K in keyof T]: T[K] extends ActionConfig<"Direction1D"> ? K : never;
	}[keyof T];

/**
 * Extracts action names typed as `"Direction2D"` from an action map.
 * @template T - The action map to filter.
 */
export type Direction2dActions<T extends ActionMap> = string &
	{
		[K in keyof T]: T[K] extends ActionConfig<"Direction2D"> ? K : never;
	}[keyof T];

/**
 * Extracts action names typed as `"Direction3D"` from an action map.
 * @template T - The action map to filter.
 */
export type Direction3dActions<T extends ActionMap> = string &
	{
		[K in keyof T]: T[K] extends ActionConfig<"Direction3D"> ? K : never;
	}[keyof T];

/**
 * Extracts action names typed as `"ViewportPosition"` from an action map.
 * @template T - The action map to filter.
 */
export type ViewportPositionActions<T extends ActionMap> = string &
	{
		[K in keyof T]: T[K] extends ActionConfig<"ViewportPosition"> ? K : never;
	}[keyof T];

/**
 * Union of all directional action name extractors (1D, 2D, 3D).
 * @template T - The action map to filter.
 */
export type AxisActions<T extends ActionMap> =
	| Direction1dActions<T>
	| Direction2dActions<T>
	| Direction3dActions<T>;

/**
 * Extracts all action names from an action map.
 * @template T - The action map to extract from.
 */
export type AllActions<T extends ActionMap> = keyof T & string;
