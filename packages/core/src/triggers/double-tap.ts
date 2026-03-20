import type { Trigger, TriggerState } from "./types";

/** Options for the double-tap trigger. */
export interface DoubleTapOptions {
	/** Maximum time in seconds between taps. */
	readonly window: number;
}

/**
 * Creates a trigger that fires on two rapid presses.
 *
 * @param options - Double-tap trigger configuration.
 * @returns A trigger that detects double taps.
 */
export function doubleTap({ window: tapWindow }: DoubleTapOptions): Trigger {
	let lastTapTime = 0;
	let tapCount = 0;

	return {
		reset(): void {
			lastTapTime = 0;
			tapCount = 0;
		},

		update(magnitude: number, _duration: number, _deltaTime: number): TriggerState {
			const now = os.clock();

			if (magnitude > 0) {
				if (now - lastTapTime < tapWindow) {
					tapCount += 1;
					if (tapCount >= 2) {
						tapCount = 0;
						return "triggered";
					}
				} else {
					tapCount = 1;
				}

				lastTapTime = now;
			}

			return "none";
		},
	};
}
