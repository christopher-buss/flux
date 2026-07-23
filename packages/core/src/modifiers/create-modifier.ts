import type { Modifier, ModifierContext, ModifierValue } from "./types";

/**
 * Wraps a single union-typed transform as a {@link Modifier}.
 *
 * `Modifier.modify` is overloaded per value kind so callers keep their input
 * type on the way out, while a modifier body naturally works over the
 * {@link ModifierValue} union and dispatches on the runtime type. The local
 * overloads re-expose that per-kind contract; their `this: Modifier` parameter
 * marks them as methods (Luau `:` calls), so the returned object satisfies
 * `Modifier` structurally without a type assertion. A plain function
 * declaration would be a callback, which roblox-ts refuses to assign to a
 * method-typed member.
 *
 * @param transform - Transform applied to any modifier value; must preserve the
 *   value's kind so the overloaded contract holds.
 * @returns A modifier whose `modify` overloads all delegate to `transform`.
 */
export function createModifier(
	transform: (value: ModifierValue, context: ModifierContext) => ModifierValue,
): Modifier {
	function modify(this: Modifier, value: number, context: ModifierContext): number;
	function modify(this: Modifier, value: Vector2, context: ModifierContext): Vector2;
	function modify(this: Modifier, value: Vector3, context: ModifierContext): Vector3;
	function modify(this: Modifier, value: ModifierValue, context: ModifierContext): ModifierValue;
	function modify(this: Modifier, value: ModifierValue, context: ModifierContext): ModifierValue {
		return transform(value, context);
	}

	return { modify };
}
