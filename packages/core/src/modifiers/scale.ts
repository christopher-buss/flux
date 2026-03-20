import type { Modifier, ModifierContext } from "./types";

/**
 * Creates a modifier that scales the input value by a constant factor.
 *
 * @param factor - The multiplier to apply.
 * @returns A modifier that multiplies the value by `factor`.
 */
export function scale(factor: number): Modifier {
	// Cast needed: roblox-ts cannot satisfy overloaded Modifier.modify signatures
	// with a single union-typed implementation method.
	return {
		modify(
			value: number | Vector2 | Vector3,
			_context: ModifierContext,
		): number | Vector2 | Vector3 {
			if (typeIs(value, "number")) {
				return value * factor;
			}

			if (typeIs(value, "Vector2")) {
				return value.mul(factor);
			}

			return value.mul(factor);
		},
	} as Modifier;
}
