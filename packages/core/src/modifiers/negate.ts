import type { Modifier, ModifierValue } from "./types";

/**
 * Creates a modifier that negates the input value.
 *
 * @returns A modifier that multiplies the value by -1.
 */
export function negate(): Modifier {
	return {
		modify(value: ModifierValue): ModifierValue {
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
