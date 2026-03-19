import type { Modifier } from "../modifiers/types";
import type { TypedTrigger } from "../triggers/types";

// Roblox-aligned action types mapping to InputAction.Type.
export type ActionType =
	| "Bool"
	| "Direction1D"
	| "Direction2D"
	| "Direction3D"
	| "ViewportPosition";

// Configuration for a single input action.
export interface ActionConfig<T extends ActionType = ActionType> {
	readonly description?: string;
	readonly enabled?: boolean;
	readonly modifiers?: ReadonlyArray<Modifier>;
	readonly triggers?: ReadonlyArray<TypedTrigger>;
	readonly type: T;
}

// A record mapping action names to their configurations.
export type ActionMap = Record<string, ActionConfig>;

// -- Type extractors: filter action names by their ActionType --

export type BoolActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Bool"> ? K : never;
}[keyof T];

export type Direction1dActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Direction1D"> ? K : never;
}[keyof T];

export type Direction2dActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Direction2D"> ? K : never;
}[keyof T];

export type Direction3dActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"Direction3D"> ? K : never;
}[keyof T];

export type ViewportPositionActions<T extends ActionMap> = {
	[K in keyof T]: T[K] extends ActionConfig<"ViewportPosition"> ? K : never;
}[keyof T];

export type AxisActions<T extends ActionMap> =
	| Direction1dActions<T>
	| Direction2dActions<T>
	| Direction3dActions<T>;

export type AllActions<T extends ActionMap> = keyof T & string;
