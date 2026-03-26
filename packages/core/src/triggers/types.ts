/** The state a trigger can be in after evaluation. */
export type TriggerState = "canceled" | "none" | "ongoing" | "triggered";

/** Stateful gate that determines when an action fires based on input magnitude and timing. */
export interface Trigger {
	/** Resets internal state (e.g., after context switch or action release). */
	reset?(): void;
	/**
	 * Evaluates the trigger for the current frame.
	 * @param magnitude - Post-modifier input magnitude (0/1 for bool, vector length for axis).
	 * @param duration - How long the input has been held in seconds.
	 * @param deltaTime - Time elapsed since last frame in seconds.
	 * @returns The resulting trigger state.
	 */
	update(magnitude: number, duration: number, deltaTime: number): TriggerState;
}

/**
 * Classification of how a trigger participates in action evaluation.
 *
 * - `"implicit"` — all must pass for the action to trigger
 * - `"explicit"` — any one passing triggers the action
 * - `"blocker"` — prevents the action if triggered.
 */
export type TriggerType = "blocker" | "explicit" | "implicit";

/** A trigger paired with its evaluation type. */
export interface TypedTrigger {
	/** The underlying trigger instance. */
	readonly trigger: Trigger;
	/** How this trigger participates in action evaluation. */
	readonly type: TriggerType;
}
