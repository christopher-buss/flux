import type { BindingLike } from "./bindings";

// Context configuration. Defines bindings, priority, and sink behavior.
export interface ContextConfig {
	readonly bindings: Record<string, ReadonlyArray<BindingLike>>;
	readonly priority: number;
	readonly sink?: boolean;
}
