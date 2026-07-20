import type { ActionEntry, ActionValueType, CaptureViewer } from "./action-entry";
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
	readEntry,
	readEntryValue,
	suppressedFalse,
	suppressedZero,
	wasJustPressed,
	wasJustReleased,
} from "./action-entry";

/**
 * A capture token's runtime shape: the full processed read surface with the
 * action pre-bound. The public `CaptureToken` type narrows this to the
 * action's kind.
 */
export interface CaptureTokenRuntime {
	/** The captured action's current scalar value. */
	axis1d(): number;
	/** The captured action's current 3D vector value. */
	axis3d(): Vector3;
	/** Whether the captured axis just became active. */
	axisBecameActive(): boolean;
	/** Whether the captured axis just became inactive. */
	axisBecameInactive(): boolean;
	/** Whether the captured action's trigger was canceled this frame. */
	canceled(): boolean;
	/** Claims the captured action for the rest of the frame. */
	claim(): boolean;
	/** The captured action's current trigger state duration. */
	currentDuration(): number;
	/** The captured action's current 2D directional vector. */
	direction2d(): Vector2;
	/** The captured action's typed runtime value. */
	getState(): ActionValueType;
	/** Whether the captured action's trigger just fired. */
	justPressed(): boolean;
	/** Whether the captured action's trigger just stopped firing. */
	justReleased(): boolean;
	/** Whether the captured action's trigger is ongoing. */
	ongoing(): boolean;
	/** The captured action's screen-space position. */
	position2d(): Vector2;
	/** Whether the captured action's trigger is currently "triggered". */
	pressed(): boolean;
	/** The captured action's previous trigger state duration. */
	previousDuration(): number;
	/** Releases the capture, restoring the holder beneath or normal reads. */
	release(): void;
	/** Whether the captured action's trigger conditions were met this frame. */
	triggered(): boolean;
}

/**
 * Acquires a capture on an action and builds its scoped reader token.
 *
 * A fresh viewer identity is pushed onto the action's capture stack, and
 * every read routed through the token carries that identity past the holder
 * check. The public `CaptureToken` type narrows the returned surface to the
 * action's kind.
 * @param entries - The action entry map.
 * @param action - The action name.
 * @returns The capture token, already installed as the active holder.
 */
// eslint-disable-next-line max-lines-per-function -- thin pre-bound read delegations
export function createCaptureToken(
	entries: Map<string, ActionEntry>,
	action: string,
): CaptureTokenRuntime {
	const entry = getEntry(entries, action);
	const viewer: CaptureViewer = {};

	function flagRead(pick: (entry: ActionEntry) => boolean): boolean {
		return readEntry(entry, { pick, viewer, whenSuppressed: suppressedFalse });
	}

	function durationRead(pick: (entry: ActionEntry) => number): number {
		return readEntry(entry, { pick, viewer, whenSuppressed: suppressedZero });
	}

	entry.captures.push(viewer);

	return {
		axis1d(): number {
			return readEntryValue(entry, viewer) as number;
		},
		axis3d(): Vector3 {
			return readEntryValue(entry, viewer) as Vector3;
		},
		axisBecameActive(): boolean {
			return flagRead(didAxisBecomeActive);
		},
		axisBecameInactive(): boolean {
			return flagRead(didAxisBecomeInactive);
		},
		canceled(): boolean {
			return flagRead(isCanceled);
		},
		claim(): boolean {
			return claimAction(entries, action);
		},
		currentDuration(): number {
			return durationRead(getCurrentDuration);
		},
		direction2d(): Vector2 {
			return readEntryValue(entry, viewer) as Vector2;
		},
		getState(): ActionValueType {
			return readEntryValue(entry, viewer);
		},
		justPressed(): boolean {
			return flagRead(wasJustPressed);
		},
		justReleased(): boolean {
			return flagRead(wasJustReleased);
		},
		ongoing(): boolean {
			return flagRead(isOngoing);
		},
		position2d(): Vector2 {
			return readEntryValue(entry, viewer) as Vector2;
		},
		pressed(): boolean {
			return flagRead(isTriggered);
		},
		previousDuration(): number {
			return durationRead(getPreviousDuration);
		},
		release(): void {
			const index = entry.captures.indexOf(viewer);
			if (index !== -1) {
				entry.captures.remove(index);
			}
		},
		triggered(): boolean {
			return flagRead(isTriggered);
		},
	};
}
