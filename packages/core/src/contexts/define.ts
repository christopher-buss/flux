import type { ContextConfig } from "../types/contexts";

/**
 * Defines input contexts with preserved literal names.
 *
 * @remarks Cross-validation against action names happens at `createCore`.
 * @template T - Record of context names to their configurations.
 * @param contexts - Map of context names to their configurations.
 * @returns The same contexts object with literal types preserved.
 */
export function defineContexts<T extends Record<string, ContextConfig>>(contexts: T): T {
	return contexts;
}

export type { ContextConfig } from "../types/contexts";
