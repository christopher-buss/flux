import type { TriggerFactory, TypedTrigger } from "./types";

/**
 * Wraps a trigger factory as implicit. All implicit triggers must pass for the
 * action to fire.
 *
 * @param create - The trigger factory to wrap.
 * @returns A typed trigger with `"implicit"` classification.
 */
export function implicit(create: TriggerFactory): TypedTrigger {
	return { create, type: "implicit" };
}

/**
 * Wraps a trigger factory as explicit. Any one explicit trigger passing fires
 * the action.
 *
 * @param create - The trigger factory to wrap.
 * @returns A typed trigger with `"explicit"` classification.
 */
export function explicit(create: TriggerFactory): TypedTrigger {
	return { create, type: "explicit" };
}

/**
 * Wraps a trigger factory as a blocker. If any blocker triggers, the action is
 * prevented.
 *
 * @param create - The trigger factory to wrap.
 * @returns A typed trigger with `"blocker"` classification.
 */
export function blocker(create: TriggerFactory): TypedTrigger {
	return { create, type: "blocker" };
}
