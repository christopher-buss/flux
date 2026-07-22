import type { TriggerFactory, TriggerState } from "./types";

/** Options for the tap trigger. */
export interface TapOptions {
	/**
	 * Maximum duration in seconds to count as a tap (exclusive — duration must
	 * be strictly less).
	 */
	readonly threshold: number;
}

/**
 * Creates a factory for triggers that fire on quick press-and-release.
 *
 * @param options - Tap trigger configuration.
 * @returns A factory minting triggers that detect taps.
 */
export function tap({ threshold }: TapOptions): TriggerFactory {
	return () => {
		return {
			update(magnitude: number, duration: number): TriggerState {
				if (magnitude === 0 && duration > 0 && duration < threshold) {
					return "triggered";
				}

				return magnitude > 0 ? "ongoing" : "none";
			},
		};
	};
}
