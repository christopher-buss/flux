import { Error } from "@rbxts/luau-polyfill";

import type { ModifierContext } from "../modifiers/types";
import type { ActionConfig, ActionMap, ActionType } from "../types/actions";
import type { BindingLike, BindingState } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { FluxCore, InputHandle } from "../types/core";
import type { ActionState, ActionValue } from "../types/state";
import type { ActionValueType, InternalActionState } from "./action-state";
import { createActionState, getMagnitude } from "./action-state";
import { createHandleFactory } from "./handle-factory";
import { processPipeline } from "./pipeline";

/**
 * Options for creating a Flux core instance.
 * @template T - The action map type.
 * @template C - The context configuration record type.
 */
export interface CreateCoreOptions<T extends ActionMap, C extends Record<string, ContextConfig>> {
	readonly actions: T;
	readonly contexts: C;
}

interface HandleData<T extends ActionMap> {
	readonly activeContexts: Set<string>;
	readonly durations: Map<string, number>;
	readonly internalState: InternalActionState;
	readonly publicState: ActionState<T>;
	readonly simulatedValues: Map<string, ActionValueType>;
}

interface ActionUpdateOptions {
	readonly actionConfig: ActionConfig;
	readonly actionName: string;
	readonly deltaTime: number;
	readonly handle: InputHandle;
	readonly handleData: HandleData<ActionMap>;
}

interface ContextActionsOptions {
	readonly actions: ActionMap;
	readonly contextConfig: ContextConfig;
	readonly deltaTime: number;
	readonly handle: InputHandle;
	readonly handleData: HandleData<ActionMap>;
	readonly processedActions: Set<string>;
}

interface HandleUpdateOptions {
	readonly actions: ActionMap;
	readonly contexts: Record<string, ContextConfig>;
	readonly deltaTime: number;
	readonly handle: InputHandle;
	readonly handleData: HandleData<ActionMap>;
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
	const { actions, contexts } = options;
	const factory = createHandleFactory();
	const handles = new Map<InputHandle, HandleData<T>>();

	return {
		addContext(handle: InputHandle, context: Contexts): void {
			validateContextName(contexts, context);
			const data = getHandleData(handles, handle);
			if (data.activeContexts.has(context)) {
				throw new Error(`context already active: ${context}`);
			}

			data.activeContexts.add(context);
		},
		destroy(): void {
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
			throw new Error("Not implemented");
		},
		rebind(
			_handle: InputHandle,
			_action: keyof T & string,
			_bindings: ReadonlyArray<BindingLike>,
		): void {
			throw new Error("Not implemented");
		},
		rebindAll(_handle: InputHandle, _bindings: BindingState<T>): void {
			throw new Error("Not implemented");
		},
		register(context: Contexts, ...rest: ReadonlyArray<Contexts>): InputHandle {
			validateContextName(contexts, context);
			for (const name of rest) {
				validateContextName(contexts, name);
			}

			return registerHandle(factory, handles, actions, [context, ...rest]);
		},
		removeContext(handle: InputHandle, context: Contexts): void {
			const data = getHandleData(handles, handle);
			if (!data.activeContexts.has(context)) {
				throw new Error(`context not active: ${context}`);
			}

			data.activeContexts.delete(context);
		},
		resetAllBindings(_handle: InputHandle): void {
			throw new Error("Not implemented");
		},
		resetBindings(_handle: InputHandle, _action: keyof T & string): void {
			throw new Error("Not implemented");
		},
		serializeBindings(_handle: InputHandle): BindingState<T> {
			throw new Error("Not implemented");
		},
		simulateAction<A extends keyof T & string>(
			handle: InputHandle,
			action: A,
			value: ActionValue<T, A>,
		): void {
			getHandleData(handles, handle).simulatedValues.set(
				action,
				value as unknown as ActionValueType,
			);
		},
		unregister(handle: InputHandle): void {
			getHandleData(handles, handle);
			handles.delete(handle);
		},
		update(deltaTime: number): void {
			for (const [handle, handleData] of handles) {
				updateHandle({
					actions,
					contexts,
					deltaTime,
					handle,
					handleData: handleData as unknown as HandleData<ActionMap>,
				});
			}
		},
	};
}

function validateContextName(contexts: Record<string, ContextConfig>, name: string): void {
	if (contexts[name] === undefined) {
		throw new Error(`unknown context: ${name}`);
	}
}

function getHandleData<T extends ActionMap>(
	handles: Map<InputHandle, HandleData<T>>,
	handle: InputHandle,
): HandleData<T> {
	const data = handles.get(handle);
	assert(data, `handle not registered: ${handle}`);
	return data;
}

function sortActiveContexts(
	activeContexts: Set<string>,
	contexts: Record<string, ContextConfig>,
): Array<[string, ContextConfig]> {
	const sorted = new Array<[string, ContextConfig]>();
	for (const name of activeContexts) {
		const config = contexts[name];
		assert(config, `missing context config: ${name}`);
		sorted.push([name, config]);
	}

	sorted.sort((first, second) => first[1].priority > second[1].priority);
	return sorted;
}

function getDefaultValue(actionType: ActionType): ActionValueType {
	switch (actionType) {
		case "Bool": {
			return false;
		}
		case "Direction1D": {
			return 0;
		}
		case "Direction2D":
		case "ViewportPosition": {
			return Vector2.zero;
		}
		case "Direction3D": {
			return Vector3.zero;
		}
	}
}

function getRawValue(
	handleData: HandleData<ActionMap>,
	actionName: string,
	actionConfig: ActionConfig,
): ActionValueType {
	return handleData.simulatedValues.get(actionName) ?? getDefaultValue(actionConfig.type);
}

function updateDuration(
	handleData: HandleData<ActionMap>,
	actionName: string,
	rawValue: ActionValueType,
	deltaTime: number,
): number {
	const magnitude = getMagnitude(rawValue);
	const previous = handleData.durations.get(actionName);
	assert(previous !== undefined, `missing duration for action: ${actionName}`);
	const updated = magnitude > 0 ? previous + deltaTime : 0;
	handleData.durations.set(actionName, updated);
	return updated;
}

function processAction(options: ActionUpdateOptions): void {
	const { actionConfig, actionName, deltaTime, handle, handleData } = options;
	const rawValue = getRawValue(handleData, actionName, actionConfig);
	const duration = updateDuration(handleData, actionName, rawValue, deltaTime);
	const modifierContext: ModifierContext = { deltaTime, handle };
	const result = processPipeline({
		actionConfig,
		deltaTime,
		duration,
		modifierContext,
		rawValue,
	});
	handleData.internalState.updateAction({
		action: actionName,
		deltaTime,
		triggerState: result.triggerState,
		value: result.value,
	});
}

function processContextActions(options: ContextActionsOptions): void {
	const { actions, contextConfig, deltaTime, handle, handleData, processedActions } = options;
	for (const [actionName] of pairs(contextConfig.bindings)) {
		if (processedActions.has(actionName)) {
			continue;
		}

		const actionConfig = actions[actionName];
		if (actionConfig === undefined) {
			continue;
		}

		processAction({ actionConfig, actionName, deltaTime, handle, handleData });
		processedActions.add(actionName);
	}
}

function updateUnprocessedActions(
	actions: ActionMap,
	processedActions: Set<string>,
	handleData: HandleData<ActionMap>,
	deltaTime: number,
): void {
	for (const [actionName, actionConfig] of pairs(actions)) {
		if (processedActions.has(actionName)) {
			continue;
		}

		handleData.durations.set(actionName, 0);
		handleData.internalState.updateAction({
			action: actionName,
			deltaTime,
			triggerState: "none",
			value: getDefaultValue(actionConfig.type),
		});
	}
}

function updateHandle(options: HandleUpdateOptions): void {
	const { actions, contexts, deltaTime, handle, handleData } = options;
	const sorted = sortActiveContexts(handleData.activeContexts, contexts);
	const processedActions = new Set<string>();
	for (const [, contextConfig] of sorted) {
		processContextActions({
			actions,
			contextConfig,
			deltaTime,
			handle,
			handleData,
			processedActions,
		});
		if (contextConfig.sink === true) {
			break;
		}
	}

	updateUnprocessedActions(actions, processedActions, handleData, deltaTime);
	handleData.simulatedValues.clear();
	handleData.internalState.endFrame();
}

function registerHandle<T extends ActionMap>(
	factory: ReturnType<typeof createHandleFactory>,
	handles: Map<InputHandle, HandleData<T>>,
	actions: T,
	contextNames: ReadonlyArray<string>,
): InputHandle {
	const handle = factory.allocate();
	const [publicState, internalState] = createActionState(actions);
	const durations = new Map<string, number>();
	for (const [name] of pairs(actions as ActionMap)) {
		durations.set(name, 0);
	}

	handles.set(handle, {
		activeContexts: new Set<string>(contextNames),
		durations,
		internalState,
		publicState,
		simulatedValues: new Map<string, ActionValueType>(),
	});
	return handle;
}
