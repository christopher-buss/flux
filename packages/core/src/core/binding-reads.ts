import type { InputPlatform } from "../bindings/classify";
import type { ActionMap } from "../types/actions";
import type { BindingLike, BindingOrigin } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { InputHandle } from "../types/core";
import { validateContextName } from "./context-lookup";
import type { HandleData } from "./handle-lifecycle";
import { getHandleData } from "./handle-lifecycle";
import type { PlatformQueryOptions } from "./resolve-bindings";
import {
	resolveBindingOrigin,
	resolveBindings,
	resolveBindingsForPlatform,
} from "./resolve-bindings";

/**
 * What every binding read needs from the core it was called on.
 *
 * The read side of the binding API shares one prologue — reject an unknown
 * context name, then find the handle's state — which lives here rather than
 * being restated by each `FluxCore` method.
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
 * A read of one named action.
 * @template T - The action map type.
 */
export interface CoreReadOptions<T extends ActionMap> extends CoreScopeOptions<T> {
	/** The action to read. */
	readonly action: string;
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
 * A read of one action narrowed to one platform.
 * @template T - The action map type.
 */
export interface CorePlatformReadOptions<T extends ActionMap> extends CoreReadOptions<T> {
	/** The platform to read. */
	readonly platform: InputPlatform;
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
	const result = {} as Record<keyof T & string, ReadonlyArray<BindingLike>>;
	for (const [actionName] of pairs(actions as Record<string, unknown>)) {
		result[actionName as keyof T & string] = resolveBindings(
			handleData,
			contexts,
			actionName,
			context,
		);
	}

	return result;
}

/**
 * Reads an action's effective bindings for one handle.
 * @template T - The action map type.
 * @param options - The action, handle and context config, plus an optional
 * context to scope the read to.
 * @returns The effective bindings for the action.
 * @throws If the context name is unknown, or the handle is not registered.
 */
export function readBindings<T extends ActionMap>(
	options: CoreReadOptions<T>,
): ReadonlyArray<BindingLike> {
	const { action, context, contexts } = options;
	return resolveBindings(scopedHandleData(options), contexts, action, context);
}

/**
 * Reads one platform's effective bindings for one handle.
 * @template T - The action map type.
 * @param options - The action, platform, handle and context config, plus an
 * optional context to scope the read to.
 * @returns That platform's effective bindings.
 * @throws If the context name is unknown, or the handle is not registered.
 */
export function readBindingsForPlatform<T extends ActionMap>(
	options: CorePlatformReadOptions<T>,
): ReadonlyArray<BindingLike> {
	return resolveBindingsForPlatform(platformQuery(options));
}

/**
 * Reads where one platform's bindings for an action come from.
 * @template T - The action map type.
 * @param options - The action, platform, handle and context config, plus an
 * optional context to scope the read to.
 * @returns The origin of that platform's bindings.
 * @throws If the context name is unknown, or the handle is not registered.
 */
export function readBindingOrigin<T extends ActionMap>(
	options: CorePlatformReadOptions<T>,
): BindingOrigin {
	return resolveBindingOrigin(platformQuery(options));
}

/**
 * Validates the queried context and finds the handle's state.
 * @template T - The action map type.
 * @param options - The handle, context config and optional context scope.
 * @returns The handle's state.
 * @throws If the context name is unknown, or the handle is not registered.
 */
function scopedHandleData<T extends ActionMap>(options: CoreScopeOptions<T>): HandleData<T> {
	const { context, contexts, handle, handles } = options;
	if (context !== undefined) {
		validateContextName(contexts, context);
	}

	return getHandleData(handles, handle);
}

/**
 * Rewrites a core-level read into the resolver's platform-scoped form.
 * @template T - The action map type.
 * @param options - The core-level read.
 * @returns The same read against resolved handle state.
 */
function platformQuery<T extends ActionMap>(
	options: CorePlatformReadOptions<T>,
): PlatformQueryOptions<T> {
	const { action, context, contexts, platform } = options;
	return { action, context, contexts, handleData: scopedHandleData(options), platform };
}
