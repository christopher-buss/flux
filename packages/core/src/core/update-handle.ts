import type { ModifierContext } from "../modifiers/types";
import type { ActionConfig, ActionMap, ActionType } from "../types/actions";
import { DEFAULT_CONTEXT_PRIORITY } from "../types/contexts";
import type { ContextConfig } from "../types/contexts";
import type { InputHandle } from "../types/core";
import type { ActionValueType, InternalActionState } from "./action-state";
import { getMagnitude } from "./action-state";
import type { InputInstanceData } from "./input-instances";
import { processPipeline } from "./pipeline";

/** Internal per-handle data used during update processing. */
export interface CoreHandleData {
	/** Set of currently active context names. */
	readonly activeContexts: Set<string>;
	/** Per-action trigger duration accumulators in seconds. */
	readonly durations: Map<string, number>;
	/** Roblox InputContext instance references. */
	readonly instanceData: InputInstanceData;
	/** Mutable internal action state used during update. */
	readonly internalState: InternalActionState;
	/** Accumulated wait time per action not yet replicated. Dev-only. */
	readonly pendingActions: Map<string, number>;
	/** Injected values from `simulateAction`. */
	readonly simulatedValues: Map<string, ActionValueType>;
	/** Actions that have already emitted a timeout warning. Dev-only. */
	readonly warnedActions: Set<string>;
}

/** Options for {@link updateHandle}. */
export interface HandleUpdateOptions {
	/** The action map defining available actions. */
	readonly actions: ActionMap;
	/** Context configurations with bindings. */
	readonly contexts: Record<string, ContextConfig>;
	/** Time elapsed since last frame in seconds. */
	readonly deltaTime: number;
	/** The input consumer handle being updated. */
	readonly handle: InputHandle;
	/** Per-handle internal data for this update cycle. */
	readonly handleData: CoreHandleData;
	/** Whether debug mode is enabled. */
	readonly isDebug: boolean;
	/** Custom timeout callback. Defaults to `warn()`. */
	readonly onReplicationTimeout?: (message: string) => void;
}

interface ActionUpdateOptions {
	readonly actionConfig: ActionConfig;
	readonly actionName: string;
	readonly deltaTime: number;
	readonly handle: InputHandle;
	readonly handleData: CoreHandleData;
}

interface ContextActionsOptions {
	readonly actions: ActionMap;
	readonly contextConfig: ContextConfig;
	readonly deltaTime: number;
	readonly handle: InputHandle;
	readonly handleData: CoreHandleData;
	readonly isDebug: boolean;
	readonly onReplicationTimeout?: (message: string) => void;
	readonly processedActions: Set<string>;
}

/**
 * Returns the default zero value for an action type.
 * @param actionType - Bool, Direction1D, Direction2D, Direction3D, or ViewportPosition.
 * @returns The corresponding zero/false value.
 */
export function getDefaultValue(actionType: ActionType): ActionValueType {
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

/**
 * Sorts active contexts by priority (descending).
 * @param activeContexts - Set of active context names.
 * @param contexts - Context configuration record.
 * @returns Sorted array of context name/config pairs.
 */
export function sortActiveContexts(
	activeContexts: Set<string>,
	contexts: Record<string, ContextConfig>,
): Array<[string, ContextConfig]> {
	const sorted = new Array<[string, ContextConfig]>();
	for (const name of activeContexts) {
		const config = contexts[name];
		assert(config, `missing context config: ${name}`);
		sorted.push([name, config]);
	}

	sorted.sort((first, second) => {
		return (
			(first[1].priority ?? DEFAULT_CONTEXT_PRIORITY) >
			(second[1].priority ?? DEFAULT_CONTEXT_PRIORITY)
		);
	});
	return sorted;
}

/**
 * Processes all actions for a single handle during an update tick.
 * @param options - The handle, actions, contexts, and delta time.
 */
export function updateHandle(options: HandleUpdateOptions): void {
	const { actions, contexts, deltaTime, handle, handleData, isDebug, onReplicationTimeout } =
		options;
	handleData.internalState.endFrame();
	const sorted = sortActiveContexts(handleData.activeContexts, contexts);
	const processedActions = new Set<string>();
	for (const [, contextConfig] of sorted) {
		processContextActions({
			actions,
			contextConfig,
			deltaTime,
			handle,
			handleData,
			isDebug,
			...(onReplicationTimeout !== undefined && { onReplicationTimeout }),
			processedActions,
		});
		if (contextConfig.sink === true) {
			break;
		}
	}

	updateUnprocessedActions(actions, processedActions, handleData, deltaTime);
	handleData.simulatedValues.clear();
}

function getRawValue(handleData: CoreHandleData, actionName: string): ActionValueType {
	const simulated = handleData.simulatedValues.get(actionName);
	if (simulated !== undefined) {
		return simulated;
	}

	const inputAction = handleData.instanceData.inputActions.get(actionName);
	assert(inputAction, `missing InputAction instance for: ${actionName}`);
	return inputAction.GetState() as ActionValueType;
}

function updateDuration(
	handleData: CoreHandleData,
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
	const rawValue = getRawValue(handleData, actionName);
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

const REPLICATION_WARN_SECONDS = 5;

function trackPendingAction(
	handleData: CoreHandleData,
	actionName: string,
	deltaTime: number,
	onTimeout?: (message: string) => void,
): void {
	if (handleData.warnedActions.has(actionName)) {
		return;
	}

	const elapsed = (handleData.pendingActions.get(actionName) ?? 0) + deltaTime;
	if (elapsed >= REPLICATION_WARN_SECONDS) {
		const message = `InputAction "${actionName}" not replicated after ${REPLICATION_WARN_SECONDS}s`;
		if (onTimeout !== undefined) {
			onTimeout(message);
		} else {
			warn(message);
		}

		handleData.warnedActions.add(actionName);
		handleData.pendingActions.delete(actionName);
		return;
	}

	handleData.pendingActions.set(actionName, elapsed);
}

function clearPendingAction(handleData: CoreHandleData, actionName: string): void {
	handleData.pendingActions.delete(actionName);
}

function resetAction(
	handleData: CoreHandleData,
	actionName: string,
	actionConfig: ActionConfig,
	deltaTime: number,
): void {
	handleData.durations.set(actionName, 0);
	handleData.internalState.updateAction({
		action: actionName,
		deltaTime,
		triggerState: "none",
		value: getDefaultValue(actionConfig.type),
	});
}

function canProcessAction(handleData: CoreHandleData, actionName: string): boolean {
	if (handleData.instanceData.owned) {
		return true;
	}

	if (handleData.simulatedValues.has(actionName)) {
		return true;
	}

	return handleData.instanceData.inputActions.has(actionName);
}

// eslint-disable-next-line max-lines-per-function -- dev-mode tracking adds guard branches
function processContextActions(options: ContextActionsOptions): void {
	const {
		actions,
		contextConfig,
		deltaTime,
		handle,
		handleData,
		isDebug,
		onReplicationTimeout,
		processedActions,
	} = options;
	for (const [actionName] of pairs(contextConfig.bindings)) {
		if (processedActions.has(actionName)) {
			continue;
		}

		const actionConfig = actions[actionName];
		if (actionConfig === undefined) {
			continue;
		}

		if (!canProcessAction(handleData, actionName)) {
			if (_G.__DEV__ && isDebug) {
				trackPendingAction(handleData, actionName, deltaTime, onReplicationTimeout);
			}

			resetAction(handleData, actionName, actionConfig, deltaTime);
			processedActions.add(actionName);
			continue;
		}

		if (_G.__DEV__ && isDebug) {
			clearPendingAction(handleData, actionName);
		}

		processAction({ actionConfig, actionName, deltaTime, handle, handleData });
		processedActions.add(actionName);
	}
}

function updateUnprocessedActions(
	actions: ActionMap,
	processedActions: Set<string>,
	handleData: CoreHandleData,
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
