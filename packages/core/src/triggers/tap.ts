import type { Trigger, TriggerState } from "./types";

/** Options for the tap trigger. */
export interface TapOptions {
	/** Maximum duration in seconds to count as a tap. */
	readonly threshold: number;
}

/**
 * Creates a trigger that fires on quick press-and-release.
 *
 * @param options - Tap trigger configuration.
 * @returns A trigger that detects taps.
 */
export function tap({ threshold }: TapOptions): Trigger {
	return {
		reset(): void {
			// Stateless — no-op.
		},

		update(magnitude: number, duration: number, _deltaTime: number): TriggerState {
			if (magnitude === 0 && duration > 0 && duration < threshold) {
				return "triggered";
			}

			return magnitude > 0 ? "ongoing" : "none";
		},
	};
}
