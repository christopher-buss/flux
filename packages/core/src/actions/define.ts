import type { ActionConfig, ActionType } from "../types/actions";

/**
 * Defines input actions with preserved literal types.
 *
 * @template T - Record of action names to their configurations.
 * @param actions - Map of action names to their configurations.
 * @returns The same actions object with literal types preserved.
 * @example
 * const actions = defineActions({
 * 	jump: bool(),
 * 	move: direction2d(),
 * });
 */
export function defineActions<T extends Record<string, ActionConfig>>(actions: T): T {
	return actions;
}

/**
 * Creates an action config with an explicit type.
 *
 * @template T - The action type literal.
 * @param config - The action configuration.
 * @returns The action configuration with type preserved.
 */
export function action<T extends ActionType>(config: ActionConfig<T>): ActionConfig<T> {
	return config;
}

/**
 * Shorthand for creating a `"Bool"` action.
 *
 * @param config - Optional action configuration (type is set automatically).
 * @returns A bool action configuration.
 */
export function bool(config?: Omit<ActionConfig, "type">): ActionConfig<"Bool"> {
	return { ...config, type: "Bool" };
}

/**
 * Shorthand for creating a `"Direction1D"` action.
 *
 * @param config - Optional action configuration (type is set automatically).
 * @returns A 1D direction action configuration.
 */
export function direction1d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction1D"> {
	return { ...config, type: "Direction1D" };
}

/**
 * Shorthand for creating a `"Direction2D"` action.
 *
 * @param config - Optional action configuration (type is set automatically).
 * @returns A 2D direction action configuration.
 */
export function direction2d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction2D"> {
	return { ...config, type: "Direction2D" };
}

/**
 * Shorthand for creating a `"Direction3D"` action.
 *
 * @param config - Optional action configuration (type is set automatically).
 * @returns A 3D direction action configuration.
 */
export function direction3d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction3D"> {
	return { ...config, type: "Direction3D" };
}

/**
 * Shorthand for creating a `"ViewportPosition"` action.
 *
 * @param config - Optional action configuration (type is set automatically).
 * @returns A viewport position action configuration.
 */
export function position2d(config?: Omit<ActionConfig, "type">): ActionConfig<"ViewportPosition"> {
	return { ...config, type: "ViewportPosition" };
}
