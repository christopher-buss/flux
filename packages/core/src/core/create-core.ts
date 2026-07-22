import type { InputPlatform } from "../bindings/classify";
import { collectContextActions } from "../contexts/collect-actions";
import type { ActionMap } from "../types/actions";
import type {
	BindingForAction,
	BindingLike,
	BindingOrigin,
	BindingState,
	RebindPlatform,
} from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import { DEFAULT_CONTEXT_PRIORITY } from "../types/contexts";
import type { FluxCore, InputHandle } from "../types/core";
import type { ActionState, ActionValue } from "../types/state";
import { deactivateContext, isContextActive } from "./active-contexts";
import { addHandleContext } from "./add-context";
import { readAllBindings, scopedHandleData } from "./binding-reads";
import { validateContextName, validateContextNames } from "./context-lookup";
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
import { destroyInputInstances, setContextEnabled } from "./input-instances";
import {
	applyRebindAll,
	applyRebindForPlatform,
	applyRebindOne,
	applyResetAll,
	applyResetAllForPlatform,
	applyResetForPlatform,
	applyResetOne,
	ownedHandleData,
	serializeFullBindings,
} from "./rebinding";
import {
	resolveBindingOrigin,
	resolveBindings,
	resolveBindingsForPlatform,
} from "./resolve-bindings";
import { updateHandle } from "./update-handle";

export type {
	CreateCoreOptions,
	ReplicationConfig,
	ReplicationTransport,
} from "./create-core-options";

/**
 * Creates a Flux core instance for managing input actions and contexts.
 *
 * Freezes the binding arrays of the context config it is handed, in place. The
 * config stays the caller's table, so the freeze is observable to the consumer
 * — see {@link freezeContextBindings}.
 * @template T - The action map type.
 * @template C - The context configuration record type.
 * @param options - Core creation options with actions and contexts.
 * @returns A fully initialized {@link FluxCore} instance.
 */
// eslint-disable-next-line flawless/max-lines-per-function -- thin delegation to helpers
export function createCore<T extends ActionMap, C extends Record<string, ContextConfig>>({
	actions,
	contexts,
	debug: isDebug,
	onReplicationTimeout,
	replication,
}: CreateCoreOptions<T, C>): FluxCore<T, keyof C & string> {
	type Contexts = keyof C & string;
	freezeContextBindings(contexts);
	const replicationTransport = replication?.transport;
	const isDevelopmentMode = _G.__DEV__ && isDebug === true;
	const factory = createHandleFactory();
	const handles = new Map<InputHandle, HandleData<T>>();

	/**
	 * Cancel function for an `addContext` call with nothing to cancel.
	 *
	 * The contract promises a function that disconnects the ChildAdded
	 * listeners a subscribed handle sets up. An owned handle creates its
	 * instances outright and has none, so it returns this rather than widening
	 * the return type to `undefined` at every call site.
	 */
	const noCancel = (): void => {
		// Nothing to disconnect.
	};

	return {
		addContext(handle: InputHandle, context: Contexts): () => void {
			addHandleContext({ actions, context, contexts, handle, handles, replicationTransport });
			return noCancel;
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
			return readAllBindings({ actions, context, contexts, handle, handles });
		},
		getBindingOrigin(
			handle: InputHandle,
			action: keyof T & string,
			platform: InputPlatform,
			context?: Contexts,
		): BindingOrigin {
			const handleData = scopedHandleData({ context, contexts, handle, handles });
			return resolveBindingOrigin({
				action,
				actions,
				context,
				contexts,
				handleData,
				platform,
			});
		},
		getBindings(
			handle: InputHandle,
			action: keyof T & string,
			context?: Contexts,
		): ReadonlyArray<BindingLike> {
			const handleData = scopedHandleData({ context, contexts, handle, handles });
			return resolveBindings({ action, context, contexts, handleData });
		},
		getBindingsForPlatform(
			handle: InputHandle,
			action: keyof T & string,
			platform: InputPlatform,
			context?: Contexts,
		): ReadonlyArray<BindingLike> {
			const handleData = scopedHandleData({ context, contexts, handle, handles });
			return resolveBindingsForPlatform({ action, context, contexts, handleData, platform });
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
			const handleData = ownedHandleData(handles, handle);
			applyRebindAll({ actions, bindings: data, contexts, handleData });
		},
		rebind<A extends keyof T & string>(
			handle: InputHandle,
			action: A,
			bindings: ReadonlyArray<BindingForAction<T[A]["type"]>>,
		): void {
			const handleData = ownedHandleData(handles, handle);
			applyRebindOne({ action, bindings, contexts, handleData });
		},
		rebindAll(handle: InputHandle, bindings: BindingState<T>): void {
			const handleData = ownedHandleData(handles, handle);
			applyRebindAll({ actions, bindings, contexts, handleData });
		},
		rebindForPlatform<A extends keyof T & string>(
			handle: InputHandle,
			action: A,
			platform: RebindPlatform,
			bindings: ReadonlyArray<BindingForAction<T[A]["type"]>>,
		): void {
			const handleData = ownedHandleData(handles, handle);
			applyRebindForPlatform({ action, bindings, contexts, handleData, platform });
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
			validateContextName(contexts, context);
			const data = getHandleData(handles, handle);
			deactivateContext(data.activeContexts, context);
			setContextEnabled(data.instanceData, context, false);
		},
		resetAllBindings(handle: InputHandle): void {
			applyResetAll(ownedHandleData(handles, handle), contexts);
		},
		resetAllBindingsForPlatform(handle: InputHandle, platform: RebindPlatform): void {
			const handleData = ownedHandleData(handles, handle);
			applyResetAllForPlatform({ contexts, handleData, platform });
		},
		resetBindings(handle: InputHandle, action: keyof T & string): void {
			applyResetOne({ action, contexts, handleData: ownedHandleData(handles, handle) });
		},
		resetBindingsForPlatform(
			handle: InputHandle,
			action: keyof T & string,
			platform: RebindPlatform,
		): void {
			const handleData = ownedHandleData(handles, handle);
			applyResetForPlatform({ action, contexts, handleData, platform });
		},
		serializeBindings(handle: InputHandle): BindingState<T> {
			return serializeFullBindings(ownedHandleData(handles, handle));
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
					...(onReplicationTimeout !== undefined ? { onReplicationTimeout } : {}),
				});
			}
		},
	};
}

/**
 * Freezes every binding array the context config holds, in place.
 *
 * `getContextBindings` hands back the very table the consumer passed to
 * {@link createCore}, and `composeBindings` passes it through by identity when
 * the action carries no override — so without this, whether a binding read
 * aliases core state would depend on whether the player has rebound.
 * `ReadonlyArray` is erased by roblox-ts and enforces nothing at runtime; one
 * pass at construction does, at no per-read cost.
 *
 * The mutation is of the caller's own table and is observable to them: a
 * config passed to `createCore` can no longer be edited afterwards.
 *
 * Skips tables that are already frozen, because `table.freeze` errors on one
 * and a context record is routinely shared between cores. That guard also
 * silently accepts a table the consumer froze themselves, which is harmless
 * here because the wanted end state is the same.
 * @param contexts - The core's context config record.
 */
function freezeContextBindings(contexts: Record<string, ContextConfig>): void {
	for (const [, contextConfig] of pairs(contexts)) {
		for (const [, bindings] of pairs(contextConfig.bindings)) {
			if (!table.isfrozen(bindings)) {
				table.freeze(bindings);
			}
		}
	}
}
