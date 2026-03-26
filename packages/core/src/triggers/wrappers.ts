import type { Trigger, TypedTrigger } from "./types";

/**
 * Wraps a trigger as implicit. All implicit triggers must pass for the action to fire.
 *
 * @param trigger - The trigger to wrap.
 * @returns A typed trigger with `"implicit"` classification.
 */
export function implicit(trigger: Trigger): TypedTrigger {
	return { trigger, type: "implicit" };
}

/**
 * Wraps a trigger as explicit. Any one explicit trigger passing fires the action.
 *
 * @param trigger - The trigger to wrap.
 * @returns A typed trigger with `"explicit"` classification.
 */
export function explicit(trigger: Trigger): TypedTrigger {
	return { trigger, type: "explicit" };
}

/**
 * Wraps a trigger as a blocker. If any blocker triggers, the action is prevented.
 *
 * @param trigger - The trigger to wrap.
 * @returns A typed trigger with `"blocker"` classification.
 */
export function blocker(trigger: Trigger): TypedTrigger {
	return { trigger, type: "blocker" };
}
