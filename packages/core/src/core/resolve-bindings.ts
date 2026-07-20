import type { InputPlatform } from "../bindings/classify";
import type { ActionMap } from "../types/actions";
import type { BindingLike, BindingOrigin } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { HandleData } from "./handle-lifecycle";
import { bucketByPlatform, composeBindings } from "./platform-overrides";

/**
 * The handle, contexts and action every binding read is scoped by.
 * @template T - The action map type.
 */
export interface BindingQueryOptions<T extends ActionMap> {
	/** The action to read. */
	readonly action: string;
	/** Context to scope the read to, or `undefined` for every active one. */
	readonly context: string | undefined;
	/** Core context config record. */
	readonly contexts: Record<string, ContextConfig>;
	/** Handle state to read. */
	readonly handleData: HandleData<T>;
}

/**
 * A binding read narrowed to one platform.
 * @template T - The action map type.
 */
export interface PlatformQueryOptions<T extends ActionMap> extends BindingQueryOptions<T> {
	/** The platform to read. */
	readonly platform: InputPlatform;
}

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
	return findContextBindings(contexts, context, action) ?? [];
}

/**
 * Resolves effective bindings by composing each platform's override bucket,
 * where one exists, over the bindings the code declares for that platform.
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
	const overrides = handleData.bindingOverrides.get(action);
	return composeBindings(overrides, () =>
		declaredBindings({ action, context, contexts, handleData }),
	);
}

/**
 * Resolves one platform's effective bindings.
 *
 * Reads the platform's override bucket when it has one and the declared
 * bindings that classify to it otherwise. Reading the bucket rather than
 * filtering the composed list by classification matters: a bucket holds
 * whatever the player put in it, so a gamepad key deliberately bound on the
 * keyboard row stays on the keyboard row.
 * @template T - The action map type.
 * @param options - The action, platform, handle state and context config,
 * plus an optional context to scope the read to.
 * @returns That platform's effective bindings, empty if it has none.
 */
export function resolveBindingsForPlatform<T extends ActionMap>(
	options: PlatformQueryOptions<T>,
): ReadonlyArray<BindingLike> {
	const { action, handleData, platform } = options;
	const bucket = handleData.bindingOverrides.get(action)?.get(platform);
	if (bucket !== undefined) {
		return bucket;
	}

	return bucketByPlatform(declaredBindings(options)).get(platform) ?? [];
}

/**
 * Reports where one platform's bindings for an action come from.
 * @template T - The action map type.
 * @param options - The action, platform, handle state and context config,
 * plus an optional context to scope the read to.
 * @returns `"override"` when that platform has an override bucket — including
 * an empty one, which is a deliberate unbind — `"default"` when it has none
 * but the action is declared, and `"undeclared"` when it is not.
 */
export function resolveBindingOrigin<T extends ActionMap>(
	options: PlatformQueryOptions<T>,
): BindingOrigin {
	const { action, handleData, platform } = options;
	if (handleData.bindingOverrides.get(action)?.get(platform) !== undefined) {
		return "override";
	}

	return isActionDeclared(options) ? "default" : "undeclared";
}

/**
 * Reads a context's bindings for an action without flattening "undeclared"
 * into "declared with nothing".
 * @param contexts - Core context config record.
 * @param context - The context name to read from.
 * @param action - The action name to look up.
 * @returns The declared bindings, or `undefined` when the context does not
 * declare the action.
 */
function findContextBindings(
	contexts: Record<string, ContextConfig>,
	context: string,
	action: string,
): ReadonlyArray<BindingLike> | undefined {
	const contextConfig = contexts[context];
	assert(contextConfig, `missing context config: ${context}`);

	return contextConfig.bindings[action];
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

/**
 * Reads the bindings the code declares for an action, from one context or
 * from every active one.
 * @template T - The action map type.
 * @param options - The action, handle state and context config, plus an
 * optional context to scope the read to.
 * @returns The bindings the code declares for the action in that scope, empty
 * when it declares none.
 */
function declaredBindings<T extends ActionMap>(
	options: BindingQueryOptions<T>,
): ReadonlyArray<BindingLike> {
	const { action, context, contexts, handleData } = options;
	return context !== undefined
		? getContextBindings(contexts, context, action)
		: mergeBindingsAcrossContexts(handleData, contexts, action);
}

/**
 * Reports whether the code declares the action at all in the queried scope.
 * @template T - The action map type.
 * @param options - The action, handle state and context config, plus an
 * optional context to scope the check to.
 * @returns `true` when the scoped context declares the action, or when any
 * active context does if no context was named.
 */
function isActionDeclared<T extends ActionMap>(options: BindingQueryOptions<T>): boolean {
	const { action, context, contexts, handleData } = options;
	if (context !== undefined) {
		return findContextBindings(contexts, context, action) !== undefined;
	}

	for (const contextName of handleData.activeContexts) {
		if (findContextBindings(contexts, contextName, action) !== undefined) {
			return true;
		}
	}

	return false;
}
