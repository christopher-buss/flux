import type { ModifierContext } from "../modifiers/types";
import { resetTriggers } from "../triggers/instantiate";
import type { TriggerInstance } from "../triggers/types";
import type { ActionConfig, ActionMap } from "../types/actions";
import type { ContextConfig } from "../types/contexts";
import type { InputHandle } from "../types/core";
import type { ActionValueType } from "./action-entry";
import { getDefaultValue, getMagnitude } from "./action-entry";
import type { InternalActionState } from "./action-state";
import type { ActiveContexts } from "./active-contexts";
import { resolveContextOrder } from "./active-contexts";
import type { InputInstanceData } from "./input-instances";
import { processPipeline } from "./pipeline";
import { resolveActionInstance } from "./resolve-action";

/** Internal per-handle data used during update processing. */
export interface CoreHandleData {
	/** Currently active context names, oldest activation first. */
	readonly activeContexts: ActiveContexts;
	/** Per-action trigger duration accumulators in seconds. */
	readonly durations: Map<string, number>;
	/**
	 * Actions whose triggers ran last frame, so leaving the set resets them.
	 */
	readonly evaluatedActions: Set<string>;
	/** Roblox InputContext instance references. */
	readonly instanceData: InputInstanceData;
	/** Mutable internal action state used during update. */
	readonly internalState: InternalActionState;
	/** Accumulated wait time per action not yet replicated. Dev-only. */
	readonly pendingActions: Map<string, number>;
	/** Previous-frame raw magnitudes, used to detect the release transition. */
	readonly previousMagnitudes: Map<string, number>;
	/** Injected values from `simulateAction`. */
	readonly simulatedValues: Map<string, ActionValueType>;
	/**
	 * This handle's own trigger instances, keyed by action name. Trigger state
	 * is per handle, never shared through the action config.
	 */
	readonly triggerInstances: Map<string, ReadonlyArray<TriggerInstance>>;
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
	readonly inputAction: InputAction | undefined;
}

interface ContextActionsOptions {
	readonly actions: ActionMap;
	readonly contextConfig: ContextConfig;
	readonly deltaTime: number;
	readonly handle: InputHandle;
	readonly handleData: CoreHandleData;
	readonly isDebug: boolean;
	readonly onReplicationTimeout?: (message: string) => void;
	readonly orderedContexts: ReadonlyArray<string>;
	readonly processedActions: Set<string>;
}

/**
 * Processes all actions for a single handle during an update tick.
 * @param options - The handle, actions, contexts, and delta time.
 */
export function updateHandle({
	actions,
	contexts,
	deltaTime,
	handle,
	handleData,
	isDebug,
	onReplicationTimeout,
}: HandleUpdateOptions): void {
	handleData.internalState.endFrame();
	const eligible = resolveContextOrder(handleData.activeContexts, contexts);
	const orderedContexts = eligible.map(({ name }) => name);
	const processedActions = new Set<string>();
	for (const { config: contextConfig } of eligible) {
		processContextActions({
			actions,
			contextConfig,
			deltaTime,
			handle,
			handleData,
			isDebug,
			...(onReplicationTimeout !== undefined ? { onReplicationTimeout } : {}),
			orderedContexts,
			processedActions,
		});
	}

	updateUnprocessedActions(actions, processedActions, handleData, deltaTime);
	handleData.simulatedValues.clear();
}

function getRawValue(
	handleData: CoreHandleData,
	actionName: string,
	inputAction: InputAction | undefined,
): ActionValueType {
	const simulated = handleData.simulatedValues.get(actionName);
	if (simulated !== undefined) {
		return simulated;
	}

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
	const previousMagnitude = handleData.previousMagnitudes.get(actionName);
	assert(previousMagnitude !== undefined, `missing previous magnitude for action: ${actionName}`);

	let updated: number;
	if (magnitude > 0) {
		updated = previous + deltaTime;
	} else if (previousMagnitude > 0) {
		// Release frame — preserve accumulated held duration so triggers
		// (e.g. tap, hold-cancel) can observe the final hold length.
		updated = previous;
	} else {
		updated = 0;
	}

	handleData.durations.set(actionName, updated);
	handleData.previousMagnitudes.set(actionName, magnitude);
	return updated;
}

function processAction({
	actionConfig,
	actionName,
	deltaTime,
	handle,
	handleData,
	inputAction,
}: ActionUpdateOptions): void {
	const rawValue = getRawValue(handleData, actionName, inputAction);
	const duration = updateDuration(handleData, actionName, rawValue, deltaTime);
	const modifierContext: ModifierContext = { deltaTime, handle };
	const result = processPipeline({
		actionConfig,
		deltaTime,
		duration,
		modifierContext,
		rawValue,
		triggerInstances: handleTriggers(handleData, actionName),
	});
	handleData.evaluatedActions.add(actionName);
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

function handleTriggers(
	handleData: CoreHandleData,
	actionName: string,
): ReadonlyArray<TriggerInstance> {
	const triggers = handleData.triggerInstances.get(actionName);
	assert(triggers, `missing trigger instances for action: ${actionName}`);
	return triggers;
}

function resetAction(
	handleData: CoreHandleData,
	actionName: string,
	actionConfig: ActionConfig,
	deltaTime: number,
): void {
	handleData.durations.set(actionName, 0);
	handleData.previousMagnitudes.set(actionName, 0);
	if (handleData.evaluatedActions.delete(actionName)) {
		resetTriggers(handleTriggers(handleData, actionName));
	}

	handleData.internalState.updateAction({
		action: actionName,
		deltaTime,
		triggerState: "none",
		value: getDefaultValue(actionConfig.type),
	});
}

function canProcessAction(
	handleData: CoreHandleData,
	actionName: string,
	inputAction: InputAction | undefined,
): boolean {
	if (handleData.instanceData.owned) {
		return true;
	}

	if (handleData.simulatedValues.has(actionName)) {
		return true;
	}

	return inputAction !== undefined;
}

// eslint-disable-next-line flawless/max-lines-per-function -- dev-mode tracking adds guard branches
function processContextActions({
	actions,
	contextConfig,
	deltaTime,
	handle,
	handleData,
	isDebug,
	onReplicationTimeout,
	orderedContexts,
	processedActions,
}: ContextActionsOptions): void {
	for (const [actionName] of pairs(contextConfig.bindings)) {
		if (processedActions.has(actionName)) {
			continue;
		}

		const actionConfig = actions[actionName];
		if (actionConfig === undefined) {
			continue;
		}

		const inputAction = resolveActionInstance(
			handleData.instanceData.actionsByContext,
			orderedContexts,
			actionName,
		);
		if (!canProcessAction(handleData, actionName, inputAction)) {
			if (isDebug && _G.__DEV__) {
				trackPendingAction(handleData, actionName, deltaTime, onReplicationTimeout);
			}

			resetAction(handleData, actionName, actionConfig, deltaTime);
			processedActions.add(actionName);
			continue;
		}

		if (isDebug && _G.__DEV__) {
			clearPendingAction(handleData, actionName);
		}

		processAction({
			actionConfig,
			actionName,
			deltaTime,
			handle,
			handleData,
			inputAction,
		});
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

		resetAction(handleData, actionName, actionConfig, deltaTime);
	}
}
