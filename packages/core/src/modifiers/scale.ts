import type { Modifier, ModifierValue } from "./types";

/**
 * Creates a modifier that scales the input value by a constant factor.
 *
 * @param factor - The multiplier to apply.
 * @returns A modifier that multiplies the value by `factor`.
 */
export function scale(factor: number): Modifier {
	return {
		modify(value: ModifierValue): ModifierValue {
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
