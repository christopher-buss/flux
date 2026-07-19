/** `InputAction` instances keyed by context name, then by action name. */
export type ActionsByContext = ReadonlyMap<string, ReadonlyMap<string, InputAction>>;

/**
 * Resolves which context's `InputAction` supplies an action's raw value.
 *
 * The first context in resolution order that owns an instance for the action
 * wins, so callers decide precedence by the order they pass in — priority
 * descending, ties broken by most recent activation.
 *
 * @param actionsByContext - Per-context instance storage to read.
 * @param orderedContexts - Active context names in resolution order.
 * @param actionName - The action whose instance to resolve.
 * @returns The winning context's instance, or `undefined` when none declares it.
 */
export function resolveActionInstance(
	actionsByContext: ActionsByContext,
	orderedContexts: ReadonlyArray<string>,
	actionName: string,
): InputAction | undefined {
	for (const contextName of orderedContexts) {
		const inputAction = actionsByContext.get(contextName)?.get(actionName);
		if (inputAction !== undefined) {
			return inputAction;
		}
	}

	return undefined;
}
