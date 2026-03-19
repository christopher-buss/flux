export interface ModifierContext {
	readonly deltaTime: number;
}

// Stub -- full implementation in Phase 2.
export interface Modifier {
	modify(value: number, context: ModifierContext): number;
	modify(value: Vector2, context: ModifierContext): Vector2;
	modify(value: Vector3, context: ModifierContext): Vector3;
}
