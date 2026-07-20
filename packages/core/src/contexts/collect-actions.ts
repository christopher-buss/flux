import type { ActionMap } from "../types/actions";
import type { ContextConfig } from "../types/contexts";

/**
 * One action checked against one context's bindings.
 */
export interface ContextActionOptions {
	/** The action name to check. */
	readonly action: string;
	/** The full action map the core was created with. */
	readonly actions: ActionMap;
	/** The context config's bindings record. */
	readonly bindings: ContextConfig["bindings"];
}

/**
 * Reports whether a context declares an action.
 *
 * Requires the action in both the context's bindings and the core's action
 * map, which is the pair `createContext` requires before it builds an
 * `InputAction` — so "declared" here means "this context has an instance for
 * it", and a context binding naming an action this build no longer has counts
 * as undeclared.
 *
 * One definition serves both {@link collectContextActions}, which answers
 * `getContextInfo().actions`, and `getBindingOrigin`'s `"undeclared"` verdict.
 * The two are documented as substitutes for each other, so they must not
 * disagree.
 * @param options - The action, action map and context bindings to check.
 * @returns `true` when the context declares the action.
 * @example
 * isContextAction({ action: "jump", actions, bindings: contexts.ui.bindings })
 */
export function isContextAction(options: ContextActionOptions): boolean {
	const { action, actions, bindings } = options;
	return actions[action] !== undefined && bindings[action] !== undefined;
}

/**
 * Returns the list of actions declared in a context's bindings, filtered
 * to the known action map so the result is guaranteed typed.
 *
 * @template T - The action map type.
 * @param actions - The full action map the core was created with.
 * @param bindings - The context config's bindings record.
 * @returns Array of action names present in both `actions` and `bindings`.
 */
export function collectContextActions<T extends ActionMap>(
	actions: T,
	bindings: ContextConfig["bindings"],
): Array<keyof T & string> {
	const result = new Array<keyof T & string>();
	for (const [name] of pairs(actions as Record<string, unknown>)) {
		if (isContextAction({ action: name, actions, bindings })) {
			result.push(name);
		}
	}

	return result;
}
