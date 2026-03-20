import type { Modifier, ModifierContext } from "./types";

/**
 * Creates a dead zone modifier that zeroes input below a threshold and rescales above it.
 *
 * @param threshold - Magnitude below which input is zeroed. Output is rescaled so there is
 *   no jump discontinuity at the boundary.
 * @returns A modifier that applies the dead zone.
 */
export function deadZone(threshold: number): Modifier {
	assert(
		threshold > 0 && threshold < 1,
		`deadZone threshold must be in (0, 1), got ${threshold}`,
	);

	// Cast needed: roblox-ts cannot satisfy overloaded Modifier.modify signatures
	// with a single union-typed implementation method.
	return {
		modify(
			value: number | Vector2 | Vector3,
			_context: ModifierContext,
		): number | Vector2 | Vector3 {
			if (typeIs(value, "number")) {
				if (math.abs(value) < threshold) {
					return 0;
				}

				return (math.sign(value) * (math.abs(value) - threshold)) / (1 - threshold);
			}

			if (typeIs(value, "Vector2")) {
				if (value.Magnitude < threshold) {
					return Vector2.zero;
				}

				return value.Unit.mul((value.Magnitude - threshold) / (1 - threshold));
			}

			const vector3 = value;
			if (vector3.Magnitude < threshold) {
				return Vector3.zero;
			}

			return vector3.Unit.mul((vector3.Magnitude - threshold) / (1 - threshold));
		},
	} as Modifier;
}
