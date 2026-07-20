import type { TriggerState } from "../triggers/types";
import type { ActionConfig, ActionMap } from "../types/actions";
import type {
	ActionState,
	ActionValue,
	CaptureOptions,
	CaptureToken,
	DebugCapture,
} from "../types/state";
import type { ActionEntry, ActionValueType } from "./action-entry";
import {
	claimAction,
	didAxisBecomeActive,
	didAxisBecomeInactive,
	expireBoundaryCancel,
	getCurrentDuration,
	getDefaultValue,
	getEntry,
	getPreviousDuration,
	isOngoing,
	isTriggered,
	read,
	readEntryCanceled,
	readValue,
	settleDrain,
	suppressedFalse,
	suppressedZero,
	valueRestsAtZero,
	wasJustPressed,
	wasJustReleased,
} from "./action-entry";
import { createCaptureToken, listDebugCaptures } from "./capture";

/** Shared result for `debugCaptures` outside development mode. */
const NO_DEBUG_CAPTURES: ReadonlyArray<DebugCapture> = [];

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

/** Options for creating an action state. */
export interface ActionStateOptions {
	/**
	 * Enables dev-mode introspection (`debugCaptures`). Requires `_G.__DEV__`
	 * to also be `true` — when `_G.__DEV__` is `false`, debug code paths
	 * become dead code eligible for removal by code transformation tools.
	 * @default false
	 */
	readonly debug?: boolean;
}

/** Internal mutators for the action state, used by the core runtime. */
export interface InternalActionState {
	/**
	 * Closes the frame: shifts current values to previous, resets claimed
	 * flags, ages any pending boundary cancel, and settles a finished drain.
	 */
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
 * @param options - Creation options; `debug` enables dev-mode introspection.
 * @returns A tuple of the public query interface and internal mutators.
 */
export function createActionState<T extends ActionMap>(
	actions: T,
	options?: ActionStateOptions,
): [ActionState<T>, InternalActionState] {
	const entries = initializeEntries(actions);

	return [buildPublicState<T>(entries, options?.debug === true), buildInternalState(entries)];
}

function createEntry(config: ActionConfig): ActionEntry {
	const defaultValue = getDefaultValue(config.type);

	return {
		canceledConsumed: false,
		canceledFor: undefined,
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
		valueRestsAtZero: valueRestsAtZero(config.type),
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
function buildPublicState<T extends ActionMap>(
	entries: Map<string, ActionEntry>,
	isDebug: boolean,
): ActionState<T> {
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
			return readEntryCanceled(getEntry(entries, action));
		},
		capture<A extends keyof T & string>(action: A, options?: CaptureOptions) {
			// The runtime token carries the full read surface; the public type
			// narrows it to the action's kind, which only resolves once `A` is
			// a concrete action name.
			return createCaptureToken({
				action,
				captureOptions: options,
				entries,
				isDebug,
			}) as unknown as CaptureToken<T, A>;
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
		debugCaptures(action) {
			if (_G.__DEV__ && isDebug) {
				return listDebugCaptures(entries, action);
			}

			return NO_DEBUG_CAPTURES;
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
		// Ages the boundary cancel while this frame's claim is still set — a
		// claimed frame consumes the cancel.
		expireBoundaryCancel(entry);
		entry.claimed = false;
		settleDrain(entry);
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
