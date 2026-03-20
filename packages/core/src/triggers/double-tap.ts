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
	let didPress = false;

	return {
		reset(): void {
			lastTapTime = 0;
			tapCount = 0;
			didPress = false;
		},

		update(magnitude: number, _duration: number, _deltaTime: number): TriggerState {
			const isPressed = magnitude > 0;
			const isRisingEdge = isPressed && !didPress;
			didPress = isPressed;
			if (!isRisingEdge) {
				return "none";
			}

			const now = os.clock();
			const isWithinWindow = now - lastTapTime < tapWindow;
			lastTapTime = now;
			tapCount = isWithinWindow ? tapCount + 1 : 1;

			if (tapCount >= 2) {
				tapCount = 0;
				return "triggered";
			}

			return "none";
		},
	};
}
