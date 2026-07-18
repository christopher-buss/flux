/** Active context names in activation order, oldest first. */
export type ActiveContexts = Array<string>;

/**
 * Reports whether a context is currently active.
 * @param activeContexts - The activation record to read.
 * @param context - The context name to look for.
 * @returns True when the context is active.
 */
export function isContextActive(activeContexts: ActiveContexts, context: string): boolean {
	return activeContexts.includes(context);
}

/**
 * Marks a context active as the most recently activated one. Activating an
 * already-active context leaves its position untouched.
 * @param activeContexts - The activation record to mutate.
 * @param context - The context name to activate.
 */
export function activateContext(activeContexts: ActiveContexts, context: string): void {
	if (isContextActive(activeContexts, context)) {
		return;
	}

	activeContexts.push(context);
}

/**
 * Creates an activation record from the contexts a handle starts with.
 * @param contextNames - Context names in the order they were requested.
 * @returns The activation record, duplicates dropped.
 */
export function createActiveContexts(contextNames: ReadonlyArray<string>): ActiveContexts {
	const activeContexts: ActiveContexts = [];
	for (const name of contextNames) {
		activateContext(activeContexts, name);
	}

	return activeContexts;
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
