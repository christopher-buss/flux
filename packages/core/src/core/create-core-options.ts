import type { ActionMap } from "../types/actions";
import type { TypedBindings } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";

/**
 * Replication transport mode.
 *
 * - `"remote"` — replicate via RemoteEvents.
 * - `"native"` — server reads client input natively (server authority).
 */
export type ReplicationTransport = "native" | "remote";

/**
 * Configuration for how input state is replicated between client and server.
 */
export interface ReplicationConfig {
	/** The transport mechanism for replication. */
	readonly transport: ReplicationTransport;
}

/**
 * Options for creating a Flux core instance.
 * @template T - The action map type.
 * @template C - The context configuration record type.
 */
export interface CreateCoreOptions<T extends ActionMap, C extends Record<string, ContextConfig>> {
	/** The action map defining available actions and their types. */
	readonly actions: T;
	/** Context configurations with validated bindings per action type. */
	readonly contexts: C & ValidatedContexts<T, C>;
	/**
	 * Enable debug warnings. Requires `_G.__DEV__` to also be `true` — when
	 * `_G.__DEV__` is `false`, debug code paths become dead code eligible
	 * for removal by code transformation tools.
	 * @default false
	 */
	readonly debug?: boolean;
	/**
	 * Called when a subscribed InputAction has not replicated within the
	 * timeout threshold. Only invoked when `debug` is `true`.
	 * Defaults to `warn()`.
	 * @internal
	 */
	readonly onReplicationTimeout?: (message: string) => void;
	/**
	 * Replication configuration. Currently a noop — will be used for
	 * server-client context synchronization in a future release.
	 *
	 * - `"remote"` — replicate via RemoteEvents (default).
	 * - `"native"` — server reads client input natively (server authority).
	 */
	readonly replication?: ReplicationConfig;
}

/**
 * Validates that each context's bindings use the correct binding shape for each action type.
 * @template T - The action map type.
 * @template C - The context configuration record type.
 */
type ValidatedContexts<T extends ActionMap, C extends Record<string, ContextConfig>> = {
	readonly [K in keyof C]: {
		readonly bindings: TypedBindings<T>;
		readonly priority?: number;
		readonly sink?: boolean;
	};
};
