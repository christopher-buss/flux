import type { TriggerState } from "../triggers/types";
import type { ActionConfig, ActionMap, ActionType } from "../types/actions";
import type { ActionState, ActionValue, CaptureToken } from "../types/state";
import type { ActionEntry, ActionValueType } from "./action-entry";
import {
	claimAction,
	didAxisBecomeActive,
	didAxisBecomeInactive,
	getCurrentDuration,
	getEntry,
	getPreviousDuration,
	isCanceled,
	isOngoing,
	isTriggered,
	read,
	readValue,
	suppressedFalse,
	suppressedZero,
	wasJustPressed,
	wasJustReleased,
} from "./action-entry";
import { createCaptureToken } from "./capture";

export { getMagnitude } from "./action-entry";
export type { ActionValueType } from "./action-entry";

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
		captures: [],
		claimed: false,
		duration: 0,
		enabled: config.enabled ?? true,
		neutralValue: defaultValue,
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

function isRawPressed(entries: Map<string, ActionEntry>, action: string): boolean {
	return getEntry(entries, action).value === true;
}

function wasRawJustPressed(entries: Map<string, ActionEntry>, action: string): boolean {
	const entry = getEntry(entries, action);

	return entry.value === true && entry.previousValue === false;
}

// eslint-disable-next-line max-lines-per-function -- thin delegation methods
function buildPublicState<T extends ActionMap>(entries: Map<string, ActionEntry>): ActionState<T> {
	return {
		axis1d(action) {
			return readValue(entries, action) as number;
		},
		axis3d(action) {
			return readValue(entries, action) as Vector3;
		},
		axisBecameActive(action) {
			return read({
				action,
				entries,
				pick: didAxisBecomeActive,
				whenSuppressed: suppressedFalse,
			});
		},
		axisBecameInactive(action) {
			return read({
				action,
				entries,
				pick: didAxisBecomeInactive,
				whenSuppressed: suppressedFalse,
			});
		},
		canceled(action) {
			return read({ action, entries, pick: isCanceled, whenSuppressed: suppressedFalse });
		},
		capture<A extends keyof T & string>(action: A) {
			return createCaptureToken(entries, action) as unknown as CaptureToken<T, A>;
		},
		claim(action) {
			return claimAction(entries, action);
		},
		currentDuration(action) {
			return read({
				action,
				entries,
				pick: getCurrentDuration,
				whenSuppressed: suppressedZero,
			});
		},
		direction2d(action) {
			return readValue(entries, action) as Vector2;
		},
		getState<A extends keyof T & string>(action: A): ActionValue<T, A> {
			return readValue(entries, action) as ActionValue<T, A>;
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
			return read({ action, entries, pick: wasJustPressed, whenSuppressed: suppressedFalse });
		},
		justReleased(action) {
			return read({
				action,
				entries,
				pick: wasJustReleased,
				whenSuppressed: suppressedFalse,
			});
		},
		ongoing(action) {
			return read({ action, entries, pick: isOngoing, whenSuppressed: suppressedFalse });
		},
		position2d(action) {
			return readValue(entries, action) as Vector2;
		},
		pressed(action) {
			return read({ action, entries, pick: isTriggered, whenSuppressed: suppressedFalse });
		},
		previousDuration(action) {
			return read({
				action,
				entries,
				pick: getPreviousDuration,
				whenSuppressed: suppressedZero,
			});
		},
		rawJustPressed(action) {
			return wasRawJustPressed(entries, action);
		},
		rawPressed(action) {
			return isRawPressed(entries, action);
		},
		triggered(action) {
			return read({ action, entries, pick: isTriggered, whenSuppressed: suppressedFalse });
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
		entry.duration = options.triggerState === "none" ? 0 : options.deltaTime;
	} else if (options.triggerState !== "none") {
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
