import type { Trigger, TriggerState } from "./types";

/** Options for the hold trigger. */
export interface HoldOptions {
	/** Minimum hold duration before release counts as "canceled" instead of "none". */
	readonly attempting: number;
	/**
	 * If true, only triggers once until released.
	 * @default false
	 */
	readonly oneShot?: boolean;
	/** Duration in seconds required to trigger. */
	readonly threshold: number;
}

/**
 * Creates a trigger that fires after input is held for a duration.
 *
 * @param options - Hold trigger configuration.
 * @returns A trigger that tracks hold duration.
 */
export function hold({ attempting, oneShot, threshold }: HoldOptions): Trigger {
	let hasTriggered = false;

	return {
		reset(): void {
			hasTriggered = false;
		},

		update(magnitude: number, duration: number, _deltaTime: number): TriggerState {
			if (magnitude === 0) {
				const didAttempt = duration > attempting && !hasTriggered;
				hasTriggered = false;
				return didAttempt ? "canceled" : "none";
			}

			if (duration >= threshold) {
				if (!hasTriggered || oneShot !== true) {
					hasTriggered = true;
					return "triggered";
				}

				return "none";
			}

			return "ongoing";
		},
	};
}
