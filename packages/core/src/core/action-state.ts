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
	neutralValue: ActionValueType;
	previousDuration: number;
	previousTriggerState: TriggerState;
	previousValue: ActionValueType;
	triggerState: TriggerState;
	value: ActionValueType;
}

/**
 * A processed read of one action, gated on the action's claimed flag.
 * @template V - The value type the read reports.
 */
interface ReadOptions<V> {
	/** The action name. */
	readonly action: string;
	/** The action entry map. */
	readonly entries: Map<string, ActionEntry>;
	/** Computes the unsuppressed result from the entry. */
	readonly pick: (entry: ActionEntry) => V;
	/** Computes the result the read reports while suppressed. */
	readonly whenSuppressed: (entry: ActionEntry) => V;
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

function suppressedFalse(): boolean {
	return false;
}

function suppressedZero(): number {
	return 0;
}

function getEntry(entries: Map<string, ActionEntry>, action: string): ActionEntry {
	const entry = entries.get(action);
	assert(entry, `unknown action: ${action}`);
	return entry;
}

/**
 * Performs a processed read, suppressed while the action is claimed.
 *
 * The single gate every processed read funnels through; `raw*` reads bypass
 * it.
 * @param options - The action to read and how to compute both outcomes.
 * @returns The suppressed result if the action is claimed, otherwise the
 * picked value.
 * @template V - The value type the read reports.
 */
function read<V>(options: ReadOptions<V>): V {
	const entry = getEntry(options.entries, options.action);

	return entry.claimed ? options.whenSuppressed(entry) : options.pick(entry);
}

function getValue(entry: ActionEntry): ActionValueType {
	return entry.value;
}

function getNeutralValue(entry: ActionEntry): ActionValueType {
	return entry.neutralValue;
}

/**
 * Reads an action's value, suppressed to its neutral value while claimed.
 * @param entries - The action entry map.
 * @param action - The action name.
 * @returns The neutral value if claimed, otherwise the current value.
 */
function readValue(entries: Map<string, ActionEntry>, action: string): ActionValueType {
	return read({ action, entries, pick: getValue, whenSuppressed: getNeutralValue });
}

function isTriggered(entry: ActionEntry): boolean {
	return entry.triggerState === "triggered";
}

function wasJustPressed(entry: ActionEntry): boolean {
	return entry.triggerState === "triggered" && entry.previousTriggerState !== "triggered";
}

function wasJustReleased(entry: ActionEntry): boolean {
	return entry.previousTriggerState === "triggered" && entry.triggerState !== "triggered";
}

function didAxisBecomeActive(entry: ActionEntry): boolean {
	return getMagnitude(entry.previousValue) === 0 && getMagnitude(entry.value) > 0;
}

function didAxisBecomeInactive(entry: ActionEntry): boolean {
	return getMagnitude(entry.previousValue) > 0 && getMagnitude(entry.value) === 0;
}

function isOngoing(entry: ActionEntry): boolean {
	return entry.triggerState === "ongoing";
}

function isCanceled(entry: ActionEntry): boolean {
	return entry.triggerState === "canceled";
}

function getCurrentDuration(entry: ActionEntry): number {
	return entry.duration;
}

function getPreviousDuration(entry: ActionEntry): number {
	return entry.previousDuration;
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
