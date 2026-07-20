import type { InputPlatform } from "../bindings/classify";
import { filterBindingsByPlatform } from "../bindings/classify";
import { isContextAction } from "../contexts/collect-actions";
import type { ActionMap } from "../types/actions";
import type { BindingLike, BindingOrigin } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { HandleData } from "./handle-lifecycle";
import type { PlatformOverrides } from "./platform-overrides";
import { composeBindings, findPlatformBucket, resolvePlatformBucket } from "./platform-overrides";

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
 * A read that has to decide whether the action is declared at all, which
 * needs the action map as well as the context bindings.
 * @template T - The action map type.
 */
export interface OriginQueryOptions<T extends ActionMap> extends PlatformQueryOptions<T> {
	/** The core's full action map. */
	readonly actions: ActionMap;
}

/**
 * One context's bindings for one action.
 */
interface ContextBindingOptions {
	/** The action name to look up. */
	readonly action: string;
	/** The context name to read from. */
	readonly context: string;
	/** Core context config record. */
	readonly contexts: Record<string, ContextConfig>;
}

/**
 * Returns the default bindings for an action in a single context.
 * @param options - The context config, context name and action to read.
 * @returns The declared bindings or an empty array.
 */
export function getContextBindings(options: ContextBindingOptions): ReadonlyArray<BindingLike> {
	return contextConfigFor(options).bindings[options.action] ?? [];
}

/**
 * Resolves effective bindings by composing each platform's override bucket,
 * where one exists, over the bindings the code declares for that platform.
 * @template T - The action map type.
 * @param options - The action, handle state and context config, plus an
 * optional context to scope the read to.
 * @returns The effective bindings for the action.
 */
export function resolveBindings<T extends ActionMap>(
	options: BindingQueryOptions<T>,
): ReadonlyArray<BindingLike> {
	return composeBindings(actionOverrides(options), () => declaredBindings(options));
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
	return resolvePlatformBucket({
		declaredFor: (target) => filterBindingsByPlatform(declaredBindings(options), target),
		overrides: actionOverrides(options),
		platform: options.platform,
	});
}

/**
 * Reports where one platform's bindings for an action come from.
 *
 * Whether the context declares the action is checked first when the read
 * names one, and only then the override bucket. Overrides are stored per action rather than per
 * context, so an action can carry one while a given context never declared
 * it — and that context has no `InputAction` for the action, so the override
 * does not reach it. Answering `"override"` there would put a row on a
 * settings screen for something the context does not have. Without a named
 * context there is no such gate, so an override wins and the action counts as
 * declared if any active context declares it.
 * @template T - The action map type.
 * @param options - The action, platform, action map, handle state and context
 * config, plus an optional context to scope the read to.
 * @returns `"undeclared"` when the scoped context does not declare the action,
 * `"override"` when that platform has an override bucket — including an empty
 * one, which is a deliberate unbind — and `"default"` otherwise.
 */
export function resolveBindingOrigin<T extends ActionMap>(
	options: OriginQueryOptions<T>,
): BindingOrigin {
	if (!isActionDeclared(options)) {
		return "undeclared";
	}

	const bucket = findPlatformBucket(actionOverrides(options), options.platform);
	return bucket !== undefined ? "override" : "default";
}

/**
 * Finds a context's config, failing loudly on a name that does not exist.
 * @param options - The context config record and the context name to find.
 * @returns That context's config.
 * @throws If the context name is unknown.
 */
function contextConfigFor(options: ContextBindingOptions): ContextConfig {
	const contextConfig = options.contexts[options.context];
	assert(contextConfig, `missing context config: ${options.context}`);
	return contextConfig;
}

/**
 * Reads an action's per-platform override buckets.
 * @template T - The action map type.
 * @param options - The action and the handle state holding its overrides.
 * @returns The buckets, or `undefined` when the action has no override.
 */
function actionOverrides<T extends ActionMap>(
	options: BindingQueryOptions<T>,
): PlatformOverrides | undefined {
	return options.handleData.bindingOverrides.get(options.action);
}

/**
 * Merges an action's declared bindings across every active context, keeping
 * first-seen order.
 * @template T - The action map type.
 * @param options - The action, handle state and context config.
 * @returns The merged bindings.
 */
function mergeBindingsAcrossContexts<T extends ActionMap>(
	options: BindingQueryOptions<T>,
): ReadonlyArray<BindingLike> {
	const { action, contexts, handleData } = options;
	const result = new Array<BindingLike>();
	const seen = new Set<BindingLike>();
	for (const context of handleData.activeContexts) {
		for (const binding of getContextBindings({ action, context, contexts })) {
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
	const { action, context, contexts } = options;
	return context !== undefined
		? getContextBindings({ action, context, contexts })
		: mergeBindingsAcrossContexts(options);
}

/**
 * Reports whether the code declares the action at all in the queried scope.
 *
 * Defers to {@link isContextAction}, so this agrees with
 * `getContextInfo().actions` by construction.
 * @template T - The action map type.
 * @param options - The action, action map, handle state and context config,
 * plus an optional context to scope the check to.
 * @returns `true` when the scoped context declares the action, or when any
 * active context does if no context was named.
 */
function isActionDeclared<T extends ActionMap>(options: OriginQueryOptions<T>): boolean {
	const { action, actions, context, contexts, handleData } = options;
	if (context !== undefined) {
		return isContextAction({
			action,
			actions,
			bindings: contextConfigFor({ action, context, contexts }).bindings,
		});
	}

	for (const contextName of handleData.activeContexts) {
		const { bindings } = contextConfigFor({ action, context: contextName, contexts });
		if (isContextAction({ action, actions, bindings })) {
			return true;
		}
	}

	return false;
}
