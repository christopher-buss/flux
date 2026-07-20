import type { ActionMap } from "../types/actions";
import type { BindingLike } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { InputHandle } from "../types/core";
import { validateContextName } from "./context-lookup";
import type { HandleData } from "./handle-lifecycle";
import { getHandleData } from "./handle-lifecycle";
import { resolveBindings } from "./resolve-bindings";

/**
 * What a binding read needs to find the state it reads from.
 * @template T - The action map type.
 */
export interface CoreScopeOptions<T extends ActionMap> {
	/** Context to scope the read to, or `undefined` for every active one. */
	readonly context: string | undefined;
	/** Core context config record. */
	readonly contexts: Record<string, ContextConfig>;
	/** The handle to read for. */
	readonly handle: InputHandle;
	/** Every registered handle's state. */
	readonly handles: Map<InputHandle, HandleData<T>>;
}

/**
 * A read of every action the core declares.
 * @template T - The action map type.
 */
export interface CoreActionMapReadOptions<T extends ActionMap> extends CoreScopeOptions<T> {
	/** The core's full action map. */
	readonly actions: T;
}

/**
 * An action map read name-by-name rather than through the action names its
 * type parameter declares.
 *
 * Every {@link ActionMap} satisfies this structurally, which lets the
 * all-actions read iterate a map whose key type is only known to the caller,
 * without asserting its type.
 */
type ActionNames = Readonly<Record<string, unknown>>;

/**
 * Validates the queried context and finds the handle's state.
 *
 * Every read entry point rejects an unknown context name before touching
 * handle state, so a typo fails on the argument rather than on whatever the
 * lookup happens to return.
 * @template T - The action map type.
 * @param options - The handle, context config and optional context scope.
 * @returns The handle's state.
 * @throws If the context name is unknown, or the handle is not registered.
 */
export function scopedHandleData<T extends ActionMap>(options: CoreScopeOptions<T>): HandleData<T> {
	const { context, contexts, handle, handles } = options;
	if (context !== undefined) {
		validateContextName(contexts, context);
	}

	return getHandleData(handles, handle);
}

/**
 * Reads every action's effective bindings for one handle.
 *
 * Resolves the handle once and reuses it, so the cost stays one lookup rather
 * than one per action.
 * @template T - The action map type.
 * @param options - The action map, handle and context config, plus an
 * optional context to scope the read to.
 * @returns Every action name mapped to its effective bindings.
 * @throws If the context name is unknown, or the handle is not registered.
 */
export function readAllBindings<T extends ActionMap>(
	options: CoreActionMapReadOptions<T>,
): Record<keyof T & string, ReadonlyArray<BindingLike>> {
	const { actions, context, contexts } = options;
	const handleData = scopedHandleData(options);
	const declared: ActionNames = actions;
	const result: Record<string, ReadonlyArray<BindingLike>> = {};
	for (const [action] of pairs(declared)) {
		result[action] = resolveBindings({ action, context, contexts, handleData });
	}

	return result;
}
