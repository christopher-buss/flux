import type { BindingLike } from "./bindings";

/** Configuration for an input context defining bindings, priority, and sink behavior. */
export interface ContextConfig {
	/** Maps action names to their input bindings. */
	readonly bindings: Record<string, ReadonlyArray<BindingLike>>;
	/** Priority level. Higher priority contexts receive input first. */
	readonly priority: number;
	/**
	 * Whether this context sinks input, preventing lower priority contexts from receiving it.
	 * @default false
	 */
	readonly sink?: boolean;
}
