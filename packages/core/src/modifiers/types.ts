import type { InputHandle } from "../types/core";

/** Runtime context passed to modifiers during value transformation. */
export interface ModifierContext {
	/** Time elapsed since last frame in seconds. */
	readonly deltaTime: number;
	/** The input consumer handle this modifier is processing for. */
	readonly handle: InputHandle;
}

/** Union of all value types that modifiers operate on. */
export type ModifierValue = number | Vector2 | Vector3;

/** Stateless value transform in the input pipeline. */
export interface Modifier {
	/** Transforms a scalar value. */
	modify(value: number, context: ModifierContext): number;
	/** Transforms a 2D vector value. */
	modify(value: Vector2, context: ModifierContext): Vector2;
	/** Transforms a 3D vector value. */
	modify(value: Vector3, context: ModifierContext): Vector3;
}
