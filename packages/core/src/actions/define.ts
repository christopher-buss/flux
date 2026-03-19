import type { ActionConfig, ActionType } from "../types/actions";

export function defineActions<T extends Record<string, ActionConfig>>(actions: T): T {
	return actions;
}

export function action<T extends ActionType>(config: ActionConfig<T>): ActionConfig<T> {
	return config;
}

export function bool(config?: Omit<ActionConfig, "type">): ActionConfig<"Bool"> {
	return { ...config, type: "Bool" };
}

export function direction1d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction1D"> {
	return { ...config, type: "Direction1D" };
}

export function direction2d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction2D"> {
	return { ...config, type: "Direction2D" };
}

export function direction3d(config?: Omit<ActionConfig, "type">): ActionConfig<"Direction3D"> {
	return { ...config, type: "Direction3D" };
}

export function position2d(config?: Omit<ActionConfig, "type">): ActionConfig<"ViewportPosition"> {
	return { ...config, type: "ViewportPosition" };
}
