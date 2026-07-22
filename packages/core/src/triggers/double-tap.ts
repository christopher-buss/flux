import type { Trigger, TriggerFactory, TriggerState } from "./types";

/** Options for the double-tap trigger. */
export interface DoubleTapOptions {
	/** Maximum time in seconds between taps. */
	readonly window: number;
}

/**
 * Creates a factory for triggers that fire on two rapid presses.
 *
 * @param options - Double-tap trigger configuration.
 * @returns A factory minting triggers that detect double taps.
 */
export function doubleTap({ window: tapWindow }: DoubleTapOptions): TriggerFactory {
	return () => createDoubleTapTrigger(tapWindow);
}

function createDoubleTapTrigger(tapWindow: number): Trigger {
	let timeSinceLastTap = math.huge;
	let tapCount = 0;
	let didPress = false;

	return {
		reset(): void {
			timeSinceLastTap = math.huge;
			tapCount = 0;
			didPress = false;
		},

		update(magnitude: number, _, deltaTime: number): TriggerState {
			timeSinceLastTap += deltaTime;

			const isPressed = magnitude > 0;
			const isRisingEdge = isPressed && !didPress;
			didPress = isPressed;
			if (!isRisingEdge) {
				return "none";
			}

			const isWithinWindow = timeSinceLastTap < tapWindow;
			timeSinceLastTap = 0;
			tapCount = isWithinWindow ? tapCount + 1 : 1;

			if (tapCount >= 2) {
				tapCount = 0;
				return "triggered";
			}

			return "none";
		},
	};
}
