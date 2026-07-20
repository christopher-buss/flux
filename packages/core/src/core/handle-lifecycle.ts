import type { ActionMap, AllActions } from "../types/actions";
import type { ContextConfig } from "../types/contexts";
import type { InputHandle } from "../types/core";
import type { ActionState } from "../types/state";
import type { ActionValueType } from "./action-entry";
import { createActionState } from "./action-state";
import { createActiveContexts } from "./active-contexts";
import type { HandleFactory } from "./handle-factory";
import { createInputInstances, findInputInstances } from "./input-instances";
import type { PlatformOverrides } from "./platform-overrides";
import type { CoreHandleData } from "./update-handle";

/**
 * Per-handle data including public action state.
 * @template T - The action map type.
 */
export interface HandleData<T extends ActionMap> extends CoreHandleData {
	/**
	 * Active binding overrides, keyed by action name and then by platform. An
	 * absent platform bucket means that platform tracks its code-defined
	 * default; a present but empty bucket is a deliberate unbind.
	 */
	readonly bindingOverrides: Map<AllActions<T>, PlatformOverrides>;
	/** The typed action state exposed to consumers. */
	readonly publicState: ActionState<T>;
}

/**
 * Options shared by every handle-creation path.
 * @template T - The action map type.
 */
interface HandleOptions<T extends ActionMap> {
	readonly actions: T;
	readonly contextNames: ReadonlyArray<string>;
	readonly debug?: boolean;
	readonly handles: Map<InputHandle, HandleData<T>>;
	readonly parent: Instance;
}

interface RegisterOptions<T extends ActionMap> extends HandleOptions<T> {
	readonly contexts: Record<string, ContextConfig>;
}

interface BuildHandleDataOptions<T extends ActionMap> {
	readonly actions: T;
	readonly contextNames: ReadonlyArray<string>;
	readonly instanceData: HandleData<T>["instanceData"];
	readonly isDebug: boolean;
}

/**
 * Allocates a new handle and registers it with owned IAS instances.
 * @template T - The action map type.
 * @param factory - The handle factory for allocation.
 * @param options - Registration configuration.
 * @returns The allocated handle.
 */
export function registerHandle<T extends ActionMap>(
	factory: HandleFactory,
	options: RegisterOptions<T>,
): InputHandle {
	const handle = factory.allocate();
	const data = createHandleData(options);
	options.handles.set(handle, data);
	return handle;
}

/**
 * Registers an externally-provided handle with owned IAS instances.
 * @template T - The action map type.
 * @param handle - The externally-provided handle.
 * @param options - Registration configuration.
 */
export function registerHandleAs<T extends ActionMap>(
	handle: InputHandle,
	options: RegisterOptions<T>,
): void {
	validateHandleUnique(options.handles, handle);
	const data = createHandleData(options);
	options.handles.set(handle, data);
}

/**
 * Allocates a new handle and subscribes to existing IAS instances.
 * @template T - The action map type.
 * @param factory - The handle factory for allocation.
 * @param options - Subscribe configuration.
 * @returns A tuple of the handle and a cancel function.
 */
export function subscribeHandle<T extends ActionMap>(
	factory: HandleFactory,
	options: HandleOptions<T>,
): [InputHandle, () => void] {
	const handle = factory.allocate();
	const [data, cancel] = createSubscribeData(options);
	options.handles.set(handle, data);
	return [handle, cancel];
}

/**
 * Subscribes an externally-provided handle to existing IAS instances.
 * @template T - The action map type.
 * @param handle - The externally-provided handle.
 * @param options - Subscribe configuration.
 * @returns A cancel function that disconnects listeners.
 */
export function subscribeHandleAs<T extends ActionMap>(
	handle: InputHandle,
	options: HandleOptions<T>,
): () => void {
	validateHandleUnique(options.handles, handle);
	const [data, cancel] = createSubscribeData(options);
	options.handles.set(handle, data);
	return cancel;
}

/**
 * Retrieves handle data or throws if not registered.
 * @template T - The action map type.
 * @param handles - The handle data map.
 * @param handle - The handle to look up.
 * @returns The stored data for the given handle.
 */
export function getHandleData<T extends ActionMap>(
	handles: Map<InputHandle, HandleData<T>>,
	handle: InputHandle,
): HandleData<T> {
	const data = handles.get(handle);
	if (data === undefined) {
		error(`handle not registered: ${handle}`);
	}

	return data;
}

function createDurations(actions: ActionMap): Map<string, number> {
	const durations = new Map<string, number>();
	for (const [name] of pairs(actions)) {
		durations.set(name, 0);
	}

	return durations;
}

function createPreviousMagnitudes(actions: ActionMap): Map<string, number> {
	const previousMagnitudes = new Map<string, number>();
	for (const [name] of pairs(actions)) {
		previousMagnitudes.set(name, 0);
	}

	return previousMagnitudes;
}

function buildHandleData<T extends ActionMap>(options: BuildHandleDataOptions<T>): HandleData<T> {
	const { actions, contextNames, instanceData, isDebug } = options;
	const [publicState, internalState] = createActionState(actions, { debug: isDebug });
	return {
		activeContexts: createActiveContexts(contextNames),
		bindingOverrides: new Map<AllActions<T>, PlatformOverrides>(),
		durations: createDurations(actions),
		instanceData,
		internalState,
		pendingActions: new Map<string, number>(),
		previousMagnitudes: createPreviousMagnitudes(actions),
		publicState,
		simulatedValues: new Map<string, ActionValueType>(),
		warnedActions: new Set<string>(),
	};
}

function createHandleData<T extends ActionMap>(options: RegisterOptions<T>): HandleData<T> {
	const { actions, contextNames, contexts, debug: isDebug, parent } = options;
	const instanceData = createInputInstances({ actions, contextNames, contexts, parent });
	return buildHandleData({ actions, contextNames, instanceData, isDebug: isDebug === true });
}

function validateHandleUnique<T extends ActionMap>(
	handles: Map<InputHandle, HandleData<T>>,
	handle: InputHandle,
): void {
	if (handles.has(handle)) {
		error(`handle already registered: ${handle}`);
	}
}

function createSubscribeData<T extends ActionMap>(
	options: HandleOptions<T>,
): [HandleData<T>, () => void] {
	const { actions, contextNames, debug: isDebug, parent } = options;
	const instanceData = findInputInstances({ actions, contextNames, parent });
	const data = buildHandleData({
		actions,
		contextNames,
		instanceData,
		isDebug: isDebug === true,
	});
	const cancel = (): void => {
		for (const connection of instanceData.connections) {
			connection.Disconnect();
		}

		instanceData.connections.clear();
	};

	return [data, cancel];
}
