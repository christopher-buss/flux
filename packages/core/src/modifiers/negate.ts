import type { Modifier, ModifierContext } from "./types";

/**
 * Creates a modifier that negates the input value.
 *
 * @returns A modifier that multiplies the value by -1.
 */
export function negate(): Modifier {
	// Cast needed: roblox-ts cannot satisfy overloaded Modifier.modify signatures
	// with a single union-typed implementation method.
	return {
		modify(
			value: number | Vector2 | Vector3,
			_context: ModifierContext,
		): number | Vector2 | Vector3 {
			if (typeIs(value, "number")) {
				return -value;
			}

			if (typeIs(value, "Vector2")) {
				return value.mul(-1);
			}

			return value.mul(-1);
		},
	} as Modifier;
}
