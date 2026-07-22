import { DEFAULT_CONTEXT_PRIORITY } from "../types/contexts";
import type { ContextConfig } from "../types/contexts";
import { requireContextConfig } from "./context-lookup";

/** Active context names in activation order, oldest first. */
export type ActiveContexts = Array<string>;

/** An active context placed in a frame's resolution order. */
export interface RankedContext {
	/** The context name. */
	readonly name: string;
	/** Position in activation order, oldest first. */
	readonly activationIndex: number;
	/** The context's configuration. */
	readonly config: ContextConfig;
	/** Effective priority, defaulted when the config omits one. */
	readonly priority: number;
}

/**
 * Ranks the contexts eligible to supply input this frame.
 *
 * Contexts sort by priority (descending), ties broken by most recent
 * activation. A sink context is the last one included, since it blocks every
 * lower-priority context beneath it.
 *
 * @param activeContexts - Active contexts in activation order.
 * @param contexts - Context configuration record.
 * @returns Eligible contexts in resolution order.
 */
export function resolveContextOrder(
	activeContexts: ActiveContexts,
	contexts: Record<string, ContextConfig>,
): Array<RankedContext> {
	const eligible = new Array<RankedContext>();
	for (const context of rankActiveContexts(activeContexts, contexts)) {
		eligible.push(context);
		if (context.config.sink === true) {
			break;
		}
	}

	return eligible;
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

function rankActiveContexts(
	activeContexts: ActiveContexts,
	contexts: Record<string, ContextConfig>,
): Array<RankedContext> {
	const ranked = new Array<RankedContext>();
	let activationIndex = 0;
	for (const name of activeContexts) {
		const config = requireContextConfig(contexts, name);
		ranked.push({
			name,
			activationIndex,
			config,
			priority: config.priority ?? DEFAULT_CONTEXT_PRIORITY,
		});
		activationIndex += 1;
	}

	ranked.sort((first, second) => {
		if (first.priority !== second.priority) {
			return first.priority > second.priority;
		}

		return first.activationIndex > second.activationIndex;
	});
	return ranked;
}
