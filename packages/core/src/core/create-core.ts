import { collectContextActions } from "../contexts/collect-actions";
import type { ActionMap } from "../types/actions";
import type {
	BindingForAction,
	BindingLike,
	BindingState,
	RebindPlatform,
} from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import { DEFAULT_CONTEXT_PRIORITY } from "../types/contexts";
import type { FluxCore, InputHandle } from "../types/core";
import type { ActionState, ActionValue } from "../types/state";
import { activateContext, deactivateContext, isContextActive } from "./active-contexts";
import { findExistingContext, validateContextName, validateContextNames } from "./context-lookup";
import type { CreateCoreOptions } from "./create-core-options";
import { createHandleFactory } from "./handle-factory";
import type { HandleData } from "./handle-lifecycle";
import {
	getHandleData,
	registerHandle,
	registerHandleAs,
	subscribeHandle,
	subscribeHandleAs,
} from "./handle-lifecycle";
import {
	addContextInstances,
	adoptContextInstances,
	destroyInputInstances,
	setContextEnabled,
} from "./input-instances";
import {
	applyRebindAll,
	applyRebindForPlatform,
	applyRebindOne,
	applyResetAll,
	applyResetForPlatform,
	applyResetOne,
	assertOwnedForRebind,
	replayOverridesIntoContext,
	serializeFullBindings,
} from "./rebinding";
import { resolveBindings } from "./resolve-bindings";
import { updateHandle } from "./update-handle";

export type {
	CreateCoreOptions,
	ReplicationConfig,
	ReplicationTransport,
} from "./create-core-options";

/**
 * Creates a Flux core instance for managing input actions and contexts.
 * @template T - The action map type.
 * @template C - The context configuration record type.
 * @param options - Core creation options with actions and contexts.
 * @returns A fully initialized {@link FluxCore} instance.
 */
// eslint-disable-next-line max-lines-per-function -- thin delegation to helpers
export function createCore<T extends ActionMap, C extends Record<string, ContextConfig>>(
	options: CreateCoreOptions<T, C>,
): FluxCore<T, keyof C & string> {
	type Contexts = keyof C & string;
	const { actions, contexts, debug: isDebug, onReplicationTimeout, replication } = options;
	const replicationTransport = replication?.transport;
	const isDevelopmentMode = _G.__DEV__ && isDebug === true;
	const factory = createHandleFactory();
	const handles = new Map<InputHandle, HandleData<T>>();

	// eslint-disable-next-line ts/no-empty-function -- intentional no-op
	const noop = (): void => {};

	return {
		addContext(handle: InputHandle, context: Contexts): () => void {
			validateContextName(contexts, context);
			const data = getHandleData(handles, handle);
			if (isContextActive(data.activeContexts, context)) {
				error(`context already active: ${context}`);
			}

			assert(
				data.instanceData.owned || replicationTransport !== "native",
				"cannot call addContext on a subscribed handle with native replication",
			);

			if (!data.instanceData.inputContexts.has(context)) {
				const existing = findExistingContext(context, data.instanceData);
				if (existing !== undefined) {
					adoptContextInstances(data.instanceData, context, existing, actions);
				} else {
					addContextInstances(context, contexts[context], actions, data.instanceData);
					replayOverridesIntoContext({
						contextName: context,
						contexts,
						handleData: data,
					});
				}
			}

			setContextEnabled(data.instanceData, context, true);
			activateContext(data.activeContexts, context);

			return noop;
		},
		destroy(): void {
			for (const [, data] of handles) {
				destroyInputInstances(data.instanceData);
			}

			handles.clear();
		},
		getAllBindings(
			handle: InputHandle,
			context?: Contexts,
		): Record<keyof T & string, ReadonlyArray<BindingLike>> {
			if (context !== undefined) {
				validateContextName(contexts, context);
			}

			const handleData = getHandleData(handles, handle);
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
		},
		getBindings(
			handle: InputHandle,
			action: keyof T & string,
			context?: Contexts,
		): ReadonlyArray<BindingLike> {
			if (context !== undefined) {
				validateContextName(contexts, context);
			}

			const handleData = getHandleData(handles, handle);
			return resolveBindings(handleData, contexts, action, context);
		},
		getContextInfo(handle: InputHandle, context: Contexts) {
			validateContextName(contexts, context);
			const data = getHandleData(handles, handle);
			const config = contexts[context];
			return {
				actions: collectContextActions(actions, config.bindings),
				active: isContextActive(data.activeContexts, context),
				priority: config.priority ?? DEFAULT_CONTEXT_PRIORITY,
				sink: config.sink ?? false,
			};
		},
		getContexts(handle: InputHandle): ReadonlyArray<Contexts> {
			const data = getHandleData(handles, handle);
			const result = new Array<Contexts>();
			for (const name of data.activeContexts) {
				result.push(name);
			}

			return result;
		},
		getState(handle: InputHandle): ActionState<T> {
			return getHandleData(handles, handle).publicState;
		},
		hasContext(handle: InputHandle, context: Contexts): boolean {
			return isContextActive(getHandleData(handles, handle).activeContexts, context);
		},
		loadBindings(handle: InputHandle, data: BindingState<T>): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyRebindAll({ actions, bindings: data, contexts, handleData });
		},
		rebind<A extends keyof T & string>(
			handle: InputHandle,
			action: A,
			bindings: ReadonlyArray<BindingForAction<T[A]["type"]>>,
		): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyRebindOne({ action, bindings, contexts, handleData });
		},
		rebindAll(handle: InputHandle, bindings: BindingState<T>): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyRebindAll({ actions, bindings, contexts, handleData });
		},
		rebindForPlatform<A extends keyof T & string>(
			handle: InputHandle,
			action: A,
			platform: RebindPlatform,
			bindings: ReadonlyArray<BindingForAction<T[A]["type"]>>,
		): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyRebindForPlatform({
				action,
				bindings,
				contexts,
				handleData,
				platform,
			});
		},
		register(
			parent: Instance,
			context: Contexts,
			...rest: ReadonlyArray<Contexts>
		): InputHandle {
			const contextNames = validateContextNames(contexts, [context, ...rest]);

			return registerHandle(factory, {
				actions,
				contextNames,
				contexts,
				debug: isDevelopmentMode,
				handles,
				parent,
			});
		},
		registerAs(
			handle: InputHandle,
			parent: Instance,
			context: Contexts,
			...rest: ReadonlyArray<Contexts>
		): void {
			const contextNames = validateContextNames(contexts, [context, ...rest]);

			registerHandleAs(handle, {
				actions,
				contextNames,
				contexts,
				debug: isDevelopmentMode,
				handles,
				parent,
			});
		},
		removeContext(handle: InputHandle, context: Contexts): void {
			const data = getHandleData(handles, handle);
			deactivateContext(data.activeContexts, context);
			setContextEnabled(data.instanceData, context, false);
		},
		resetAllBindings(handle: InputHandle): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyResetAll(handleData, contexts);
		},
		resetBindings(handle: InputHandle, action: keyof T & string): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyResetOne({ action, contexts, handleData });
		},
		resetBindingsForPlatform(
			handle: InputHandle,
			action: keyof T & string,
			platform: RebindPlatform,
		): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyResetForPlatform({ action, contexts, handleData, platform });
		},
		serializeBindings(handle: InputHandle): BindingState<T> {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			return serializeFullBindings(handleData) as BindingState<T>;
		},
		simulateAction<A extends keyof T & string>(
			handle: InputHandle,
			action: A,
			value: ActionValue<T, A>,
		): void {
			getHandleData(handles, handle).simulatedValues.set(action, value);
		},
		subscribe(parent: Instance, context: Contexts, ...rest: ReadonlyArray<Contexts>) {
			const contextNames = validateContextNames(contexts, [context, ...rest]);

			return subscribeHandle(factory, {
				actions,
				contextNames,
				debug: isDevelopmentMode,
				handles,
				parent,
			});
		},
		subscribeAs(
			handle: InputHandle,
			parent: Instance,
			context: Contexts,
			...rest: ReadonlyArray<Contexts>
		): () => void {
			const contextNames = validateContextNames(contexts, [context, ...rest]);

			return subscribeHandleAs(handle, {
				actions,
				contextNames,
				debug: isDevelopmentMode,
				handles,
				parent,
			});
		},
		unregister(handle: InputHandle): void {
			const data = getHandleData(handles, handle);
			destroyInputInstances(data.instanceData);
			handles.delete(handle);
		},
		update(deltaTime: number): void {
			for (const [handle, handleData] of handles) {
				updateHandle({
					actions,
					contexts,
					deltaTime,
					handle,
					handleData,
					isDebug: isDevelopmentMode,
					...(onReplicationTimeout !== undefined && { onReplicationTimeout }),
				});
			}
		},
	};
}
