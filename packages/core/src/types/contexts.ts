import type { BindingLike } from "./bindings";

/**
 * Default priority for input contexts, matching the Roblox engine default.
 * @see https://create.roblox.com/docs/reference/engine/classes/InputContext#Priority
 */
export const DEFAULT_CONTEXT_PRIORITY = 1000;

/**
 * Configuration for an input context defining bindings, priority, and sink behavior.
 * @see https://create.roblox.com/docs/reference/engine/classes/InputContext
 */
export interface ContextConfig {
	/** Maps action names to their input bindings. */
	readonly bindings: Record<string, ReadonlyArray<BindingLike>>;
	/**
	 * Priority level. Higher priority contexts receive input first.
	 * @default 1000 (Roblox engine default)
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputContext#Priority
	 */
	readonly priority?: number;
	/**
	 * Whether this context sinks input, preventing lower priority contexts from receiving it.
	 * @default false
	 * @see https://create.roblox.com/docs/reference/engine/classes/InputContext#Sink
	 */
	readonly sink?: boolean;
}
