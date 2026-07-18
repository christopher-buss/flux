/** Active context names in activation order, oldest first. */
export type ActiveContexts = Array<string>;

/**
 * Marks a context active as the most recently activated one.
 * @param activeContexts - The activation record to mutate.
 * @param context - The context name to activate.
 */
export function activateContext(activeContexts: ActiveContexts, context: string): void {
	activeContexts.push(context);
}

/**
 * Marks a context inactive, leaving the order of the rest untouched.
 * @param activeContexts - The activation record to mutate.
 * @param context - The context name to deactivate.
 */
export function deactivateContext(activeContexts: ActiveContexts, context: string): void {
	const index = activeContexts.indexOf(context);
	if (index < 0) {
		error(`context not active: ${context}`);
	}

	activeContexts.remove(index);
}

/**
 * Reports whether a context is currently active.
 * @param activeContexts - The activation record to read.
 * @param context - The context name to look for.
 * @returns True when the context is active.
 */
export function isContextActive(activeContexts: ActiveContexts, context: string): boolean {
	return activeContexts.includes(context);
}
