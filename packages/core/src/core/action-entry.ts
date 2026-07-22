import type { TriggerState } from "../triggers/types";
import type { ActionType } from "../types/actions";
import type { ActionState } from "../types/state";

/** Union of all possible action value types at runtime. */
export type ActionValueType = boolean | number | Vector2 | Vector3;

/**
 * The identity a processed read is performed as. Capture tokens read as their
 * viewer; plain {@link ActionState} reads carry no viewer.
 *
 * Suppression compares viewers by identity only. The optional fields are
 * dev-mode metadata recorded at acquisition and surfaced by
 * `debugCaptures`; they play no part in arbitration.
 */
export interface CaptureViewer {
	/** The `debugLabel` supplied at acquisition; dev mode only. */
	readonly debugLabel?: string | undefined;
	/** The acquisition-site traceback; recorded in dev mode only. */
	readonly traceback?: string | undefined;
}

/** Per-action mutable state driven by the pipeline and read by consumers. */
export interface ActionEntry {
	/**
	 * Whether the pending boundary cancel has had its one exposure — either
	 * read by the displaced viewer or carried across one frame reset. The next
	 * reset drops it. Meaningless while {@link ActionEntry.canceledFor} is
	 * undefined.
	 */
	canceledConsumed: boolean;
	/**
	 * The viewer whose in-flight view a capture boundary force-dropped;
	 * undefined outside a boundary frame. The gameplay (viewer-less) reader is
	 * represented by an internal sentinel so an empty slot and a canceled
	 * gameplay reader stay distinct. Two boundaries in one frame overwrite it —
	 * last wins.
	 */
	canceledFor: CaptureViewer | undefined;
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
	/**
	 * Whether this action's value rests at zero when nobody is interacting.
	 *
	 * True for presses and deflections, false for positions: a cursor
	 * coordinate is non-zero at rest, so magnitude cannot tell an interaction
	 * from a resting pointer. See {@link ActionEntry.value}.
	 */
	readonly valueRestsAtZero: boolean;
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
 * The holder identity of a draining capture — a capture held by nobody.
 *
 * Pushed when the top holder releases mid-press. No token carries this
 * identity, so the standard `viewer !== topHolder` gate keeps every
 * capture-aware read suppressed while `raw*` bypasses as always. The drain
 * settles at the frame boundary once magnitude reaches zero.
 *
 * Never leaves this module: all stack mutation funnels through
 * {@link acquireCapture}, {@link releaseCapture} and {@link settleDrain}, so
 * any future stack enumerator (for example dev-mode introspection) must skip
 * this entry — it is not a real holder.
 */
const DRAIN_HOLDER: CaptureViewer = {};

/**
 * The identity {@link ActionEntry.canceledFor} stores for the gameplay
 * (viewer-less) reader — plain `ActionState` reads carry `viewer: undefined`,
 * so a sentinel keeps "slot empty" and "slot = gameplay" distinct. Never
 * leaves this module: reads normalize their viewer through it.
 */
const GAMEPLAY_READER: CaptureViewer = {};

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
 * Whether an action type's value rests at zero when nobody is interacting.
 *
 * Presses and deflections spring back; a position does not, so magnitude
 * cannot tell a live interaction from a resting pointer.
 * @param actionType - Bool, Direction1D, Direction2D, Direction3D, or ViewportPosition.
 * @returns True for kinds whose value rests at zero.
 */
export function valueRestsAtZero(actionType: ActionType): boolean {
	switch (actionType) {
		case "Bool":
		case "Direction1D":
		case "Direction2D":
		case "Direction3D": {
			return true;
		}
		case "ViewportPosition": {
			return false;
		}
	}
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
 * Pushes a viewer onto an action's capture stack as the new top holder.
 *
 * A capture acquired mid-drain supersedes the drain: the new holder reads
 * the in-flight state through, and protecting whoever is underneath is now
 * its job. Keeps at most one drain holder on the stack, always on top.
 *
 * Acquiring over a visible in-flight interaction is a capture boundary: the
 * displaced viewer — the previous top holder, or the gameplay reader if the
 * stack was empty — gets the one-frame boundary cancel. Acquiring mid-drain
 * or over a flat action cancels nothing; every viewer already read flat.
 * @param entry - The action entry being captured.
 * @param viewer - The acquiring token's identity.
 */
export function acquireCapture(entry: ActionEntry, viewer: CaptureViewer): void {
	const displaced = getTopHolder(entry);
	if (displaced === DRAIN_HOLDER) {
		entry.captures.pop();
	} else if (hasLiveInteraction(entry)) {
		recordBoundaryCancel(entry, displaced ?? GAMEPLAY_READER);
	}

	entry.captures.push(viewer);
}

/**
 * Removes a viewer from an action's capture stack, draining if needed.
 *
 * Releasing the top mid-press starts a drain — the in-flight press must not
 * leak to whoever is underneath. The drain start is a capture boundary: the
 * releaser's own in-flight view is force-dropped, so it gets the one-frame
 * boundary cancel. Shadowed holders never saw the press, so their release is
 * clean, as is every release of an action that holds no live interaction.
 * Releasing a viewer that is not on the stack is a no-op.
 * @param entry - The action entry being released.
 * @param viewer - The releasing token's identity.
 */
export function releaseCapture(entry: ActionEntry, viewer: CaptureViewer): void {
	const index = entry.captures.indexOf(viewer);
	if (index === -1) {
		return;
	}

	const didHoldTop = index === entry.captures.size() - 1;
	entry.captures.remove(index);

	if (didHoldTop && hasLiveInteraction(entry)) {
		recordBoundaryCancel(entry, viewer);
		entry.captures.push(DRAIN_HOLDER);
	}
}

/**
 * Ends an action's drain once the in-flight press has settled.
 *
 * Runs at the frame boundary, so the frame where magnitude reaches zero is
 * still suppressed — not even the trailing release edge leaks to whoever is
 * underneath. Terminates on magnitude, not trigger state: a custom trigger
 * can leave "triggered" while the button is still physically down.
 *
 * Shares {@link hasLiveInteraction} with the two boundaries that start a
 * drain, so a kind that can never be in flight can never be left draining.
 * @param entry - The action entry to settle.
 */
export function settleDrain(entry: ActionEntry): void {
	if (getTopHolder(entry) === DRAIN_HOLDER && !hasLiveInteraction(entry)) {
		entry.captures.pop();
	}
}

/**
 * Whether a capture-stack entry is a real holder rather than the drain
 * sentinel.
 *
 * Stack enumerators (dev-mode introspection) must skip the drain — it is a
 * capture held by nobody, not a holder to report.
 * @param viewer - The stack entry to test.
 * @returns True for a real holder's viewer.
 */
export function isRealHolder(viewer: CaptureViewer): boolean {
	return viewer !== DRAIN_HOLDER;
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
 * The suppressed result for boolean and edge reads.
 * @returns Always false.
 */
export function suppressedFalse(): boolean {
	return false;
}

/**
 * Reads whether an entry is canceled for the given viewer.
 *
 * Two cancel sources compose: a capture boundary force-dropping the viewer's
 * in-flight view this frame, or the trigger itself reporting "canceled". The
 * boundary cancel targets the displaced viewer directly — the boundary is
 * exactly what suppressed them, so it bypasses the capture gate — while the
 * trigger-phase cancel goes through the standard processed-read gate. A claim
 * eats both, keeping "every processed read returns false while claimed"
 * exception-free.
 * @param entry - The action entry to read.
 * @param viewer - The identity reading; undefined for plain state reads.
 * @returns True if the viewer was boundary-canceled this frame or reads an
 * unsuppressed trigger-phase cancel.
 */
export function readEntryCanceled(entry: ActionEntry, viewer?: CaptureViewer): boolean {
	if (entry.claimed) {
		return false;
	}

	// Only the displaced viewer's own read consumes the slot. A bystander's
	// read must leave it alone, or one consumer's read would mutate what
	// another sees — the shape ADR 0001 rejects auto-consume to avoid.
	if (entry.canceledFor === (viewer ?? GAMEPLAY_READER)) {
		entry.canceledConsumed = true;
		return true;
	}

	// The gate is inlined rather than routed through `readEntry` because the
	// slot check above must bypass capture suppression while the
	// trigger-phase check below must respect it — one options table cannot
	// express both halves.
	return !isCaptureSuppressedFor(entry, viewer) && isCanceled(entry);
}

/**
 * Consumes the frame's claim, ageing the boundary cancel first.
 *
 * The one ordering constraint inside the frame reset: `expireBoundaryCancel`
 * reads `entry.claimed`, so clearing the claim first would turn a cancel the
 * claim ate into one that resurfaces next frame. The pair lives here, and the
 * ageing step is module-private, so there is nothing left at the call site to
 * reorder.
 * @param entry - The action entry to reset for the next frame.
 */
export function consumeFrameClaim(entry: ActionEntry): void {
	expireBoundaryCancel(entry);
	entry.claimed = false;
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

function getTopHolder(entry: ActionEntry): CaptureViewer | undefined {
	return entry.captures[entry.captures.size() - 1];
}

/**
 * Whether the entry currently shows a visible in-flight interaction.
 *
 * The condition both capture boundaries turn on: a boundary over a flat
 * action drops no view, so it cancels nothing and starts no drain.
 *
 * Magnitude only answers this for values that rest at zero. A position rests
 * wherever the pointer sits, so it is never in flight — there is no
 * interaction to withhold, only a coordinate the next reader should see. A
 * drain on one would also never settle.
 * @param entry - The action entry to test.
 * @returns True if the action's value has non-zero magnitude and its kind
 * rests at zero.
 */
function hasLiveInteraction(entry: ActionEntry): boolean {
	return entry.valueRestsAtZero && getMagnitude(entry.value) > 0;
}

/**
 * Records a capture boundary in the entry's cancel slot.
 *
 * The single owner of the slot's write rule: only the displaced viewer is
 * named, and an earlier boundary this frame is overwritten — last wins,
 * documented rather than queued. Callers gate on
 * {@link hasLiveInteraction}.
 * @param entry - The action entry at the boundary.
 * @param displaced - The viewer whose view the boundary force-drops.
 */
function recordBoundaryCancel(entry: ActionEntry, displaced: CaptureViewer): void {
	entry.canceledFor = displaced;
	entry.canceledConsumed = false;
}

/**
 * The capture half of the suppression rule: whether a capture hides the
 * entry from the given viewer.
 * @param entry - The action entry being read.
 * @param viewer - The identity reading; undefined for plain state reads.
 * @returns True if a capture suppresses this viewer.
 */
function isCaptureSuppressedFor(entry: ActionEntry, viewer: CaptureViewer | undefined): boolean {
	const topHolder = getTopHolder(entry);

	return topHolder !== undefined && topHolder !== viewer;
}

/**
 * Whether a processed read is suppressed for the given viewer.
 *
 * The rule is `claimed || (captured && viewer !== topHolder)`: a claim
 * suppresses every viewer, and a capture suppresses everyone except the
 * token on top of the stack — shadowed holders read inert too. The two
 * reasons stay separable because the boundary cancel bypasses exactly one of
 * them: {@link readEntryCanceled} respects the claim but not the capture.
 * @param entry - The action entry being read.
 * @param viewer - The identity reading; undefined for plain state reads.
 * @returns True if the read reports its suppressed result.
 */
function isSuppressedFor(entry: ActionEntry, viewer: CaptureViewer | undefined): boolean {
	return entry.claimed || isCaptureSuppressedFor(entry, viewer);
}

/**
 * Whether the entry's trigger was canceled this frame.
 *
 * Trigger-phase only — the boundary cancel composes with it in
 * {@link readEntryCanceled}.
 * @param entry - The action entry to read.
 * @returns True if the trigger was canceled.
 */
function isCanceled(entry: ActionEntry): boolean {
	return entry.triggerState === "canceled";
}

/**
 * Ages the pending boundary cancel at the frame reset, expiring it once it
 * has had its one exposure.
 *
 * A boundary can be recorded at any point relative to `core.update`, since a
 * capture is acquired from consumer code and `endFrame` runs first inside the
 * update. Expiring purely on the frame reset would therefore lose every cancel
 * recorded before the next update, so an unseen cancel is carried across
 * exactly one reset instead — enough for the read phase to see it, and bounded
 * so a stale cancel cannot surface frames later.
 *
 * A cancel the claim ate counts as exposed: a claimed frame consumes it like
 * any other processed read, so it must not resurface next frame.
 * @param entry - The action entry to age. Must still carry this frame's claim,
 * which is why {@link consumeFrameClaim} is the only caller.
 */
function expireBoundaryCancel(entry: ActionEntry): void {
	if (entry.canceledFor === undefined) {
		return;
	}

	if (!entry.canceledConsumed && !entry.claimed) {
		entry.canceledConsumed = true;
		return;
	}

	entry.canceledFor = undefined;
	entry.canceledConsumed = false;
}

function getValue(entry: ActionEntry): ActionValueType {
	return entry.value;
}

function getNeutralValue(entry: ActionEntry): ActionValueType {
	return entry.neutralValue;
}
