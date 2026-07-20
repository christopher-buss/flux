import type { TriggerState } from "../triggers/types";
import type { ActionState } from "../types/state";

/** Union of all possible action value types at runtime. */
export type ActionValueType = boolean | number | Vector2 | Vector3;

/**
 * The identity a processed read is performed as. Capture tokens read as their
 * viewer; plain {@link ActionState} reads carry no viewer.
 */
export type CaptureViewer = object;

/** Per-action mutable state driven by the pipeline and read by consumers. */
export interface ActionEntry {
	/** Stack of capture holders; the last element is the active holder. */
	captures: Array<CaptureViewer>;
	/** Whether the action is claimed for the rest of the frame. */
	claimed: boolean;
	/** How long the current trigger state has been active in seconds. */
	duration: number;
	/** Whether the action is enabled. */
	enabled: boolean;
	/** The value suppressed reads report, per the action's type. */
	neutralValue: ActionValueType;
	/** How long the previous trigger state lasted in seconds. */
	previousDuration: number;
	/** The trigger state at the end of the previous frame. */
	previousTriggerState: TriggerState;
	/** The value at the end of the previous frame. */
	previousValue: ActionValueType;
	/** The current trigger state. */
	triggerState: TriggerState;
	/** The current post-pipeline value. */
	value: ActionValueType;
}

/**
 * A processed read against an already-resolved entry.
 * @template V - The value type the read reports.
 */
export interface ReadEntryOptions<V> {
	/** Computes the unsuppressed result from the entry. */
	readonly pick: (entry: ActionEntry) => V;
	/** The identity reading; omitted for plain {@link ActionState} reads. */
	readonly viewer?: CaptureViewer | undefined;
	/** Computes the result the read reports while suppressed. */
	readonly whenSuppressed: (entry: ActionEntry) => V;
}

/**
 * A processed read of one action by name, gated on claims and captures.
 * @template V - The value type the read reports.
 */
export interface ReadOptions<V> extends ReadEntryOptions<V> {
	/** The action name. */
	readonly action: string;
	/** The action entry map. */
	readonly entries: Map<string, ActionEntry>;
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
 * Looks up an action's entry, erroring on unknown action names.
 * @param entries - The action entry map.
 * @param action - The action name.
 * @returns The action's entry.
 */
export function getEntry(entries: Map<string, ActionEntry>, action: string): ActionEntry {
	const entry = entries.get(action);
	assert(entry, `unknown action: ${action}`);
	return entry;
}

/**
 * Performs a processed read against an already-resolved entry.
 *
 * The single gate every processed read funnels through — {@link read}
 * resolves the entry by name first, and capture tokens resolve theirs once
 * at acquisition. `raw*` reads bypass it.
 * @param entry - The action entry to read.
 * @param options - The viewer and how to compute both outcomes.
 * @returns The suppressed result if the read is suppressed for the viewer,
 * otherwise the picked value.
 * @template V - The value type the read reports.
 */
export function readEntry<V>(entry: ActionEntry, options: ReadEntryOptions<V>): V {
	return isSuppressedFor(entry, options.viewer)
		? options.whenSuppressed(entry)
		: options.pick(entry);
}

/**
 * Performs a processed read by action name, with no viewer identity.
 *
 * Resolves the entry and delegates to {@link readEntry}.
 * @param options - The action to read and how to compute both outcomes.
 * @returns The suppressed result if the action is claimed or captured,
 * otherwise the picked value.
 * @template V - The value type the read reports.
 */
export function read<V>(options: ReadOptions<V>): V {
	return readEntry(getEntry(options.entries, options.action), options);
}

/**
 * Reads an entry's value, suppressed to its neutral value while claimed or
 * captured by another viewer.
 * @param entry - The action entry to read.
 * @param viewer - The identity reading; undefined for plain state reads.
 * @returns The neutral value if suppressed, otherwise the current value.
 */
export function readEntryValue(entry: ActionEntry, viewer?: CaptureViewer): ActionValueType {
	return readEntry(entry, { pick: getValue, viewer, whenSuppressed: getNeutralValue });
}

/**
 * Reads an action's value by name, with no viewer identity.
 * @param entries - The action entry map.
 * @param action - The action name.
 * @returns The neutral value if claimed or captured, otherwise the current
 * value.
 */
export function readValue(entries: Map<string, ActionEntry>, action: string): ActionValueType {
	return readEntryValue(getEntry(entries, action));
}

/**
 * Claims an action for the rest of the frame.
 * @param entries - The action entry map.
 * @param action - The action name.
 * @returns True if the claim succeeded (not already claimed this frame).
 */
export function claimAction(entries: Map<string, ActionEntry>, action: string): boolean {
	const entry = getEntry(entries, action);
	if (entry.claimed) {
		return false;
	}

	entry.claimed = true;

	return true;
}

/**
 * The suppressed result for boolean and edge reads.
 * @returns Always false.
 */
export function suppressedFalse(): boolean {
	return false;
}

/**
 * The suppressed result for duration reads.
 * @returns Always 0.
 */
export function suppressedZero(): number {
	return 0;
}

/**
 * Whether the entry's trigger is currently "triggered".
 * @param entry - The action entry to read.
 * @returns True if the trigger is active.
 */
export function isTriggered(entry: ActionEntry): boolean {
	return entry.triggerState === "triggered";
}

/**
 * Whether the entry's trigger transitioned to "triggered" this frame.
 * @param entry - The action entry to read.
 * @returns True if the trigger just fired.
 */
export function wasJustPressed(entry: ActionEntry): boolean {
	return entry.triggerState === "triggered" && entry.previousTriggerState !== "triggered";
}

/**
 * Whether the entry's trigger transitioned from "triggered" this frame.
 * @param entry - The action entry to read.
 * @returns True if the trigger just stopped firing.
 */
export function wasJustReleased(entry: ActionEntry): boolean {
	return entry.previousTriggerState === "triggered" && entry.triggerState !== "triggered";
}

/**
 * Whether the entry's value transitioned from zero to non-zero magnitude.
 * @param entry - The action entry to read.
 * @returns True if the axis just became active.
 */
export function didAxisBecomeActive(entry: ActionEntry): boolean {
	return getMagnitude(entry.previousValue) === 0 && getMagnitude(entry.value) > 0;
}

/**
 * Whether the entry's value transitioned from non-zero to zero magnitude.
 * @param entry - The action entry to read.
 * @returns True if the axis just became inactive.
 */
export function didAxisBecomeInactive(entry: ActionEntry): boolean {
	return getMagnitude(entry.previousValue) > 0 && getMagnitude(entry.value) === 0;
}

/**
 * Whether the entry's trigger is currently "ongoing".
 * @param entry - The action entry to read.
 * @returns True if the trigger is ongoing.
 */
export function isOngoing(entry: ActionEntry): boolean {
	return entry.triggerState === "ongoing";
}

/**
 * Whether the entry's trigger was canceled this frame.
 * @param entry - The action entry to read.
 * @returns True if the trigger was canceled.
 */
export function isCanceled(entry: ActionEntry): boolean {
	return entry.triggerState === "canceled";
}

/**
 * Reads how long the entry's current trigger state has been active.
 * @param entry - The action entry to read.
 * @returns Duration in seconds.
 */
export function getCurrentDuration(entry: ActionEntry): number {
	return entry.duration;
}

/**
 * Reads how long the entry's previous trigger state lasted.
 * @param entry - The action entry to read.
 * @returns Duration in seconds.
 */
export function getPreviousDuration(entry: ActionEntry): number {
	return entry.previousDuration;
}

/**
 * Whether a processed read is suppressed for the given viewer.
 *
 * The rule is `claimed || (captured && viewer !== topHolder)`: a claim
 * suppresses every viewer, and a capture suppresses everyone except the
 * token on top of the stack — shadowed holders read inert too.
 * @param entry - The action entry being read.
 * @param viewer - The identity reading; undefined for plain state reads.
 * @returns True if the read reports its suppressed result.
 */
function isSuppressedFor(entry: ActionEntry, viewer: CaptureViewer | undefined): boolean {
	if (entry.claimed) {
		return true;
	}

	const holder = entry.captures[entry.captures.size() - 1];

	return holder !== undefined && holder !== viewer;
}

function getValue(entry: ActionEntry): ActionValueType {
	return entry.value;
}

function getNeutralValue(entry: ActionEntry): ActionValueType {
	return entry.neutralValue;
}
