import type { TriggerState } from "../triggers/types";
import type { ActionConfig, ActionMap, ActionType } from "../types/actions";
import type { ActionState, ActionValue } from "../types/state";

/** Union of all possible action value types at runtime. */
export type ActionValueType = boolean | number | Vector2 | Vector3;

/** Options for updating an action's state in the pipeline. */
export interface UpdateActionOptions {
	/** The action name. */
	readonly action: string;
	/** Time elapsed since last update in seconds. */
	readonly deltaTime: number;
	/** The current trigger state. */
	readonly triggerState: TriggerState;
	/** The post-pipeline value. */
	readonly value: ActionValueType;
}

/** Internal mutators for the action state, used by the core runtime. */
export interface InternalActionState {
	/** Shifts current values to previous and resets claimed flags. */
	endFrame(): void;
	/** Sets whether an action is enabled. */
	setEnabled(action: string, enabled: boolean): void;
	/** Updates an action's value, trigger state, and duration. */
	updateAction(options: UpdateActionOptions): void;
}

interface ActionEntry {
	claimed: boolean;
	duration: number;
	enabled: boolean;
	previousDuration: number;
	previousTriggerState: TriggerState;
	previousValue: ActionValueType;
	triggerState: TriggerState;
	value: ActionValueType;
}

/**
 * Computes scalar magnitude from any action value type.
 * @param value - The action value to compute magnitude for.
 * @returns Scalar magnitude: boolean→0/1, number→abs, vector→Magnitude.
 */
export function getMagnitude(value: ActionValueType): number {
	if (typeIs(value, "boolean")) {
		return value ? 1 : 0;
	}

	if (typeIs(value, "number")) {
		return math.abs(value);
	}

	if (typeIs(value, "Vector2")) {
		return value.Magnitude;
	}

	return value.Magnitude;
}

/**
 * Creates an action state tuple for querying and mutating input state.
 * @template T - The action map type.
 * @param actions - The action configuration map.
 * @returns A tuple of the public query interface and internal mutators.
 */
export function createActionState<T extends ActionMap>(
	actions: T,
): [ActionState<T>, InternalActionState] {
	const entries = initializeEntries(actions);

	return [buildPublicState<T>(entries), buildInternalState(entries)];
}

function defaultValueForType(actionType: ActionType): ActionValueType {
	switch (actionType) {
		case "Bool": {
			return false;
		}
		case "Direction1D": {
			return 0;
		}
		case "Direction2D": {
			return Vector2.zero;
		}
		case "Direction3D": {
			return Vector3.zero;
		}
		case "ViewportPosition": {
			return Vector2.zero;
		}
	}
}

function createEntry(config: ActionConfig): ActionEntry {
	const defaultValue = defaultValueForType(config.type);

	return {
		claimed: false,
		duration: 0,
		enabled: config.enabled ?? true,
		previousDuration: 0,
		previousTriggerState: "none",
		previousValue: defaultValue,
		triggerState: "none",
		value: defaultValue,
	};
}

function initializeEntries(actions: ActionMap): Map<string, ActionEntry> {
	const entries = new Map<string, ActionEntry>();

	for (const [name, config] of pairs(actions)) {
		entries.set(name, createEntry(config));
	}

	return entries;
}

function getEntry(entries: Map<string, ActionEntry>, action: string): ActionEntry {
	const entry = entries.get(action);
	assert(entry, `unknown action: ${action}`);
	return entry;
}

function isPressed(entries: Map<string, ActionEntry>, action: string): boolean {
	return getEntry(entries, action).value === true;
}

function wasJustPressed(entries: Map<string, ActionEntry>, action: string): boolean {
	const entry = getEntry(entries, action);

	return entry.value === true && entry.previousValue === false;
}

function wasJustReleased(entries: Map<string, ActionEntry>, action: string): boolean {
	const entry = getEntry(entries, action);

	return entry.value === false && entry.previousValue === true;
}

function getAxis1d(entries: Map<string, ActionEntry>, action: string): number {
	return getEntry(entries, action).value as number;
}

function getAxis3d(entries: Map<string, ActionEntry>, action: string): Vector3 {
	return getEntry(entries, action).value as Vector3;
}

function getDirection2d(entries: Map<string, ActionEntry>, action: string): Vector2 {
	return getEntry(entries, action).value as Vector2;
}

function getPosition2d(entries: Map<string, ActionEntry>, action: string): Vector2 {
	return getEntry(entries, action).value as Vector2;
}

function didAxisBecomeActive(entries: Map<string, ActionEntry>, action: string): boolean {
	const entry = getEntry(entries, action);

	return getMagnitude(entry.previousValue) === 0 && getMagnitude(entry.value) > 0;
}

function didAxisBecomeInactive(entries: Map<string, ActionEntry>, action: string): boolean {
	const entry = getEntry(entries, action);

	return getMagnitude(entry.previousValue) > 0 && getMagnitude(entry.value) === 0;
}

function isTriggered(entries: Map<string, ActionEntry>, action: string): boolean {
	return getEntry(entries, action).triggerState === "triggered";
}

function isOngoing(entries: Map<string, ActionEntry>, action: string): boolean {
	return getEntry(entries, action).triggerState === "ongoing";
}

function isCanceled(entries: Map<string, ActionEntry>, action: string): boolean {
	return getEntry(entries, action).triggerState === "canceled";
}

function getCurrentDuration(entries: Map<string, ActionEntry>, action: string): number {
	return getEntry(entries, action).duration;
}

function getPreviousDuration(entries: Map<string, ActionEntry>, action: string): number {
	return getEntry(entries, action).previousDuration;
}

function claimAction(entries: Map<string, ActionEntry>, action: string): boolean {
	const entry = getEntry(entries, action);
	if (entry.claimed) {
		return false;
	}

	entry.claimed = true;

	return true;
}

function isActionClaimed(entries: Map<string, ActionEntry>, action: string): boolean {
	return getEntry(entries, action).claimed;
}

function isActionAvailable(entries: Map<string, ActionEntry>, action: string): boolean {
	const entry = getEntry(entries, action);

	return entry.enabled && !entry.claimed;
}

function isActionEnabled(entries: Map<string, ActionEntry>, action: string): boolean {
	return getEntry(entries, action).enabled;
}

// eslint-disable-next-line max-lines-per-function -- thin delegation methods
function buildPublicState<T extends ActionMap>(entries: Map<string, ActionEntry>): ActionState<T> {
	return {
		axis1d(action) {
			return getAxis1d(entries, action);
		},
		axis3d(action) {
			return getAxis3d(entries, action);
		},
		axisBecameActive(action) {
			return didAxisBecomeActive(entries, action);
		},
		axisBecameInactive(action) {
			return didAxisBecomeInactive(entries, action);
		},
		canceled(action) {
			return isCanceled(entries, action);
		},
		claim(action) {
			return claimAction(entries, action);
		},
		currentDuration(action) {
			return getCurrentDuration(entries, action);
		},
		direction2d(action) {
			return getDirection2d(entries, action);
		},
		getState<A extends keyof T & string>(action: A): ActionValue<T, A> {
			return getEntry(entries, action).value as ActionValue<T, A>;
		},
		isAvailable(action) {
			return isActionAvailable(entries, action);
		},
		isClaimed(action) {
			return isActionClaimed(entries, action);
		},
		isEnabled(action) {
			return isActionEnabled(entries, action);
		},
		justPressed(action) {
			return wasJustPressed(entries, action);
		},
		justReleased(action) {
			return wasJustReleased(entries, action);
		},
		ongoing(action) {
			return isOngoing(entries, action);
		},
		position2d(action) {
			return getPosition2d(entries, action);
		},
		pressed(action) {
			return isPressed(entries, action);
		},
		previousDuration(action) {
			return getPreviousDuration(entries, action);
		},
		triggered(action) {
			return isTriggered(entries, action);
		},
	} as const satisfies ActionState<T>;
}

function endFrame(entries: Map<string, ActionEntry>): void {
	for (const [, entry] of entries) {
		entry.previousValue = entry.value;
		entry.previousTriggerState = entry.triggerState;
		entry.claimed = false;
	}
}

function setEnabled(entries: Map<string, ActionEntry>, action: string, enabled: boolean): void {
	getEntry(entries, action).enabled = enabled;
}

function updateAction(entries: Map<string, ActionEntry>, options: UpdateActionOptions): void {
	const entry = getEntry(entries, options.action);
	entry.value = options.value;

	if (options.triggerState !== entry.triggerState) {
		entry.previousDuration = entry.duration;
		entry.duration = options.deltaTime;
	} else {
		entry.duration += options.deltaTime;
	}

	entry.triggerState = options.triggerState;
}

function buildInternalState(entries: Map<string, ActionEntry>): InternalActionState {
	return {
		endFrame() {
			endFrame(entries);
		},
		setEnabled(action, enabled) {
			setEnabled(entries, action, enabled);
		},
		updateAction(options) {
			updateAction(entries, options);
		},
	};
}
