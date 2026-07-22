import type { TriggerInstance, TypedTrigger } from "./types";

/**
 * Mints one live trigger per declaration, giving the caller sole ownership of
 * their state.
 *
 * @param triggers - The declared triggers from an action config.
 * @returns Live triggers in declaration order.
 * @example
 * ```ts
 * const instances = instantiateTriggers(actionConfig.triggers);
 * ```
 */
export function instantiateTriggers(
	triggers: ReadonlyArray<TypedTrigger> | undefined,
): ReadonlyArray<TriggerInstance> {
	if (triggers === undefined) {
		return [];
	}

	return triggers.map(({ create, type: triggerType }) => {
		return {
			trigger: create(),
			type: triggerType,
		};
	});
}

/**
 * Clears the state of every trigger in a set.
 * @param triggers - The live triggers to reset.
 */
export function resetTriggers(triggers: ReadonlyArray<TriggerInstance>): void {
	for (const { trigger } of triggers) {
		trigger.reset?.();
	}
}
