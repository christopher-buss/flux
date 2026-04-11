import { FluxError } from "../errors";
import { ContextError } from "../errors/context-error";
import type { ActionMap } from "../types/actions";
import type { BindingForAction, BindingLike, BindingState, TypedBindings } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { FluxCore, InputHandle } from "../types/core";
import type { ActionState, ActionValue } from "../types/state";
import { createHandleFactory } from "./handle-factory";
import type { HandleData } from "./handle-lifecycle";
import {
	getHandleData,
	registerHandle,
	registerHandleAs,
	subscribeHandle,
	subscribeHandleAs,
} from "./handle-lifecycle";
import type { InputInstanceData } from "./input-instances";
import { addContextInstances, destroyInputInstances, setContextEnabled } from "./input-instances";
import {
	applyRebindAll,
	applyRebindOne,
	applyResetAll,
	applyResetOne,
	assertOwnedForRebind,
	serializeFullBindings,
} from "./rebinding";
import { updateHandle } from "./update-handle";

/**
 * Replication transport mode.
 *
 * - `"remote"` — replicate via RemoteEvents.
 * - `"native"` — server reads client input natively (server authority).
 */
export type ReplicationTransport = "native" | "remote";

/** Configuration for how input state is replicated between client and server. */
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
			if (data.activeContexts.has(context)) {
				throw new ContextError(`context already active: ${context}`, context);
			}

			if (!data.instanceData.owned && replicationTransport === "native") {
				throw new FluxError(
					"cannot call addContext on a subscribed handle with native replication",
				);
			}

			if (!data.instanceData.inputContexts.has(context)) {
				const existing = findExistingContext(context, data.instanceData);
				if (existing !== undefined) {
					data.instanceData.inputContexts.set(context, existing);
				} else {
					addContextInstances(context, contexts[context], actions, data.instanceData);
				}
			}

			setContextEnabled(data.instanceData, context, true);
			data.activeContexts.add(context);

			return noop;
		},
		destroy(): void {
			for (const [, data] of handles) {
				destroyInputInstances(data.instanceData);
			}

			handles.clear();
		},
		getContexts(handle: InputHandle): ReadonlyArray<Contexts> {
			const data = getHandleData(handles, handle);
			const result = new Array<Contexts>();
			for (const name of data.activeContexts) {
				result.push(name as Contexts);
			}

			return result;
		},
		getState(handle: InputHandle): ActionState<T> {
			return getHandleData(handles, handle).publicState;
		},
		hasContext(handle: InputHandle, context: Contexts): boolean {
			return getHandleData(handles, handle).activeContexts.has(context);
		},
		loadBindings(handle: InputHandle, data: BindingState<T>): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyRebindAll(handleData, contexts, data);
		},
		rebind<A extends keyof T & string>(
			handle: InputHandle,
			action: A,
			bindings: ReadonlyArray<BindingForAction<T[A]["type"]>>,
		): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyRebindOne(handleData, action, bindings as ReadonlyArray<BindingLike>);
		},
		rebindAll(handle: InputHandle, bindings: BindingState<T>): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyRebindAll(handleData, contexts, bindings);
		},
		register(
			parent: Instance,
			context: Contexts,
			...rest: ReadonlyArray<Contexts>
		): InputHandle {
			validateContextName(contexts, context);
			for (const name of rest) {
				validateContextName(contexts, name);
			}

			return registerHandle(factory, {
				actions,
				contextNames: [context, ...rest],
				contexts,
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
			validateContextName(contexts, context);
			for (const name of rest) {
				validateContextName(contexts, name);
			}

			registerHandleAs(handle, {
				actions,
				contextNames: [context, ...rest],
				contexts,
				handles,
				parent,
			});
		},
		removeContext(handle: InputHandle, context: Contexts): void {
			const data = getHandleData(handles, handle);
			if (!data.activeContexts.has(context)) {
				throw new ContextError(`context not active: ${context}`, context);
			}

			setContextEnabled(data.instanceData, context, false);
			data.activeContexts.delete(context);
		},
		resetAllBindings(handle: InputHandle): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyResetAll(handleData, contexts);
		},
		resetBindings(handle: InputHandle, action: keyof T & string): void {
			const handleData = getHandleData(handles, handle);
			assertOwnedForRebind(handleData);
			applyResetOne(handleData, contexts, action);
		},
		serializeBindings(handle: InputHandle): BindingState<T> {
			const handleData = getHandleData(handles, handle);
			return serializeFullBindings(handleData, contexts) as BindingState<T>;
		},
		simulateAction<A extends keyof T & string>(
			handle: InputHandle,
			action: A,
			value: ActionValue<T, A>,
		): void {
			getHandleData(handles, handle).simulatedValues.set(action, value);
		},
		subscribe(parent: Instance, context: Contexts, ...rest: ReadonlyArray<Contexts>) {
			validateContextName(contexts, context);
			for (const name of rest) {
				validateContextName(contexts, name);
			}

			return subscribeHandle(factory, {
				actions,
				contextNames: [context, ...rest],
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
			validateContextName(contexts, context);
			for (const name of rest) {
				validateContextName(contexts, name);
			}

			return subscribeHandleAs(handle, {
				actions,
				contextNames: [context, ...rest],
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

function validateContextName(contexts: Record<string, ContextConfig>, name: string): void {
	if (contexts[name] === undefined) {
		throw new ContextError(`unknown context: ${name}`, name);
	}
}

function findExistingContext(
	contextName: string,
	data: InputInstanceData,
): InputContext | undefined {
	const folder = data.parent.FindFirstChild("input");
	if (folder === undefined || !classIs(folder, "Folder")) {
		return undefined;
	}

	const existing = folder.FindFirstChild(contextName);
	if (existing !== undefined && classIs(existing, "InputContext")) {
		return existing;
	}

	return undefined;
}
