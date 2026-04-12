import type { ActionMap } from "../types/actions";
import type { BindingLike } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { HandleData } from "./handle-lifecycle";

/**
 * Returns the default bindings for an action in a single context.
 * @param contexts - Core context config record.
 * @param context - The context name to read from.
 * @param action - The action name to look up.
 * @returns The declared bindings or an empty array.
 */
export function getContextBindings(
	contexts: Record<string, ContextConfig>,
	context: string,
	action: string,
): ReadonlyArray<BindingLike> {
	const contextConfig = contexts[context];
	if (contextConfig === undefined) {
		return [];
	}

	const bindings = (
		contextConfig.bindings as Record<string, ReadonlyArray<BindingLike> | undefined>
	)[action];
	return bindings ?? [];
}

/**
 * Resolves effective bindings: override then context then merge.
 * @template T - The action map type.
 * @param handleData - Handle state to read.
 * @param contexts - Core context config record.
 * @param action - The action name to resolve.
 * @param context - Optional context to scope the query.
 * @returns The effective bindings for the action.
 */
export function resolveBindings<T extends ActionMap>(
	handleData: HandleData<T>,
	contexts: Record<string, ContextConfig>,
	action: string,
	context?: string,
): ReadonlyArray<BindingLike> {
	const override = handleData.bindingOverrides.get(action);
	if (override !== undefined) {
		return override;
	}

	if (context !== undefined) {
		return getContextBindings(contexts, context, action);
	}

	return mergeBindingsAcrossContexts(handleData, contexts, action);
}

function mergeBindingsAcrossContexts<T extends ActionMap>(
	handleData: HandleData<T>,
	contexts: Record<string, ContextConfig>,
	action: string,
): ReadonlyArray<BindingLike> {
	const result = new Array<BindingLike>();
	const seen = new Set<BindingLike>();
	for (const contextName of handleData.activeContexts) {
		for (const binding of getContextBindings(contexts, contextName, action)) {
			if (!seen.has(binding)) {
				seen.add(binding);
				result.push(binding);
			}
		}
	}

	return result;
}
