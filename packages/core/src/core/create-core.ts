import { ContextError } from "../errors/context-error";
import { HandleError } from "../errors/handle-error";
import type { ActionMap } from "../types/actions";
import type { BindingLike, BindingState } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { FluxCore, InputHandle } from "../types/core";
import type { ActionState, ActionValue } from "../types/state";
import type { ActionValueType } from "./action-state";
import { createActionState } from "./action-state";
import { createHandleFactory } from "./handle-factory";
import {
	addContextInstances,
	createInputInstances,
	destroyInputInstances,
	setContextEnabled,
} from "./input-instances";
import type { CoreHandleData } from "./update-handle";
import { updateHandle } from "./update-handle";

/**
 * Options for creating a Flux core instance.
 * @template T - The action map type.
 * @template C - The context configuration record type.
 */
export interface CreateCoreOptions<T extends ActionMap, C extends Record<string, ContextConfig>> {
	readonly actions: T;
	readonly contexts: C;
	/** Parent instance for InputContext network ownership (e.g. Players.LocalPlayer). */
	readonly parent?: Instance;
}

interface HandleData<T extends ActionMap> extends CoreHandleData {
	readonly publicState: ActionState<T>;
}

interface RegisterHandleOptions<T extends ActionMap> {
	readonly actions: T;
	readonly contextNames: ReadonlyArray<string>;
	readonly contexts: Record<string, ContextConfig>;
	readonly factory: ReturnType<typeof createHandleFactory>;
	readonly handles: Map<InputHandle, HandleData<T>>;
	readonly parent?: Instance;
}

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
	const { actions, contexts, parent } = options;
	const factory = createHandleFactory();
	const handles = new Map<InputHandle, HandleData<T>>();

	return {
		addContext(handle: InputHandle, context: Contexts): void {
			validateContextName(contexts, context);
			const data = getHandleData(handles, handle);
			if (data.activeContexts.has(context)) {
				throw new ContextError(`context already active: ${context}`, context);
			}

			const contextConfig = contexts[context];
			assert(contextConfig, `missing context config: ${context}`);
			addContextInstances(context, contextConfig, actions, data.instanceData);
			setContextEnabled(data.instanceData, context, true);
			data.activeContexts.add(context);
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
		loadBindings(_handle: InputHandle, _data: BindingState<T>): void {
			error("Not implemented");
		},
		rebind(
			_handle: InputHandle,
			_action: keyof T & string,
			_bindings: ReadonlyArray<BindingLike>,
		): void {
			error("Not implemented");
		},
		rebindAll(_handle: InputHandle, _bindings: BindingState<T>): void {
			error("Not implemented");
		},
		register(context: Contexts, ...rest: ReadonlyArray<Contexts>): InputHandle {
			validateContextName(contexts, context);
			for (const name of rest) {
				validateContextName(contexts, name);
			}

			return registerHandle({
				actions,
				contextNames: [context, ...rest],
				contexts,
				factory,
				handles,
				...(parent !== undefined && { parent }),
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
		resetAllBindings(_handle: InputHandle): void {
			error("Not implemented");
		},
		resetBindings(_handle: InputHandle, _action: keyof T & string): void {
			error("Not implemented");
		},
		serializeBindings(_handle: InputHandle): BindingState<T> {
			error("Not implemented");
		},
		simulateAction<A extends keyof T & string>(
			handle: InputHandle,
			action: A,
			value: ActionValue<T, A>,
		): void {
			getHandleData(handles, handle).simulatedValues.set(action, value);
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

function getHandleData<T extends ActionMap>(
	handles: Map<InputHandle, HandleData<T>>,
	handle: InputHandle,
): HandleData<T> {
	const data = handles.get(handle);
	if (data === undefined) {
		throw new HandleError(`handle not registered: ${handle}`);
	}

	return data;
}

function registerHandle<T extends ActionMap>(options: RegisterHandleOptions<T>): InputHandle {
	const { actions, contextNames, contexts, factory, handles, parent } = options;
	const handle = factory.allocate();
	const [publicState, internalState] = createActionState(actions);
	const durations = new Map<string, number>();
	for (const [name] of pairs(actions as ActionMap)) {
		durations.set(name, 0);
	}

	const instanceData = createInputInstances({
		actions,
		contextNames,
		contexts,
		...(parent !== undefined && { parent }),
	});
	handles.set(handle, {
		activeContexts: new Set<string>(contextNames),
		durations,
		instanceData,
		internalState,
		publicState,
		simulatedValues: new Map<string, ActionValueType>(),
	});
	return handle;
}
