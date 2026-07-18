/**
 * Active context names mapped to the activation sequence number that records
 * when each became active. Higher number = more recently activated.
 */
export type ActiveContexts = Map<string, number>;

/**
 * Marks a context active as the most recently activated one.
 * @param activeContexts - The activation record to mutate.
 * @param context - The context name to activate.
 */
export function activateContext(activeContexts: ActiveContexts, context: string): void {
	let highest = 0;
	for (const [, sequence] of activeContexts) {
		highest = math.max(highest, sequence);
	}

	activeContexts.set(context, highest + 1);
}

/**
 * Creates an activation record from the contexts a handle starts with.
 * @param contextNames - Context names in the order they were requested.
 * @returns The activation record.
 */
export function createActiveContexts(contextNames: ReadonlyArray<string>): ActiveContexts {
	const activeContexts: ActiveContexts = new Map<string, number>();
	for (const name of contextNames) {
		activateContext(activeContexts, name);
	}

	return activeContexts;
}

/**
 * Lists active contexts oldest activation first.
 * @param activeContexts - The activation record to read.
 * @returns Context names in activation order.
 */
export function activationOrder(activeContexts: ActiveContexts): Array<string> {
	const names = new Array<string>();
	for (const [name] of activeContexts) {
		names.push(name);
	}

	names.sort((first, second) => {
		return (activeContexts.get(first) ?? 0) < (activeContexts.get(second) ?? 0);
	});
	return names;
}
