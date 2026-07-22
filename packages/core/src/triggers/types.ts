/** The state a trigger can be in after evaluation. */
export type TriggerState = "canceled" | "none" | "ongoing" | "triggered";

/**
 * Stateful gate that determines when an action fires based on input magnitude
 * and timing.
 */
export interface Trigger {
	/**
	 * Clears internal state. Called whenever the action stops being evaluated —
	 * no active context declares it, or its input instance is missing.
	 */
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

/**
 * Mints a fresh trigger. Action configs are shared by every handle on a core,
 * so triggers are declared as factories and instantiated per handle.
 */
export type TriggerFactory = () => Trigger;

/** A trigger factory paired with its evaluation type. */
export interface TypedTrigger {
	/** Mints a trigger for one handle. */
	readonly create: TriggerFactory;
	/** How this trigger participates in action evaluation. */
	readonly type: TriggerType;
}

/** A live trigger owned by a single handle, paired with its evaluation type. */
export interface TriggerInstance {
	/** The handle's own trigger. */
	readonly trigger: Trigger;
	/** How this trigger participates in action evaluation. */
	readonly type: TriggerType;
}
