import type { ActionMap } from "../types/actions";
import type { ContextConfig } from "../types/contexts";

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
		if ((bindings as Record<string, unknown>)[name] !== undefined) {
			result.push(name as keyof T & string);
		}
	}

	return result;
}
