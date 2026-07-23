import type { TriggerState } from "../triggers/types";
import type { ActionConfig, ActionMap } from "../types/actions";
import type {
	ActionState,
	ActionValue,
	CaptureOptions,
	CaptureToken,
	DebugCapture,
} from "../types/state";
import type { ActionEntries, ActionEntry, ActionValueType } from "./action-entry";
import {
	claimAction,
	consumeFrameClaim,
	didAxisBecomeActive,
	didAxisBecomeInactive,
	getCurrentDuration,
	getEntry,
	getNeutralValue,
	getPreviousDuration,
	isActionValueOfKind,
	isOngoing,
	isTriggered,
	read,
	readEntryCanceled,
	readEntryValue,
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
	const neutralValue = getNeutralValue(config.type);

	return {
		canceledConsumed: false,
		canceledFor: undefined,
		captures: [],
		claimed: false,
		duration: 0,
		enabled: config.enabled ?? true,
		kind: config.type,
		neutralValue,
		previousDuration: 0,
		previousTriggerState: "none",
		previousValue: neutralValue,
		triggerState: "none",
		value: neutralValue,
		valueRestsAtZero: valueRestsAtZero(config.type),
	};
}

function initializeEntries(actions: ActionMap): Record<string, ActionEntry> {
	const entries: Record<string, ActionEntry> = {};

	for (const [name, config] of pairs(actions)) {
		entries[name] = createEntry(config);
	}

	return entries;
}

function isActionClaimed(entries: Record<string, ActionEntry>, action: string): boolean {
	return getEntry(entries, action).claimed;
}

function isActionAvailable(entries: Record<string, ActionEntry>, action: string): boolean {
	const entry = getEntry(entries, action);

	return entry.enabled && !entry.claimed;
}

function isActionEnabled(entries: Record<string, ActionEntry>, action: string): boolean {
	return getEntry(entries, action).enabled;
}

function isRawPressed(entries: Record<string, ActionEntry>, action: string): boolean {
	return getEntry(entries, action).value === true;
}

function wasRawJustPressed(entries: Record<string, ActionEntry>, action: string): boolean {
	const entry = getEntry(entries, action);

	return entry.value === true && entry.previousValue === false;
}

// eslint-disable-next-line flawless/max-lines-per-function -- thin delegation methods
function buildPublicState<T extends ActionMap>(
	entries: Record<string, ActionEntry>,
	isDebug: boolean,
): ActionState<T> {
	// The single sanctioned bridge between runtime entries and per-action
	// types: `entries` was built from the same `actions: T` the caller passed
	// in — one entry per action, kind taken from that action's config — so
	// viewing it as `ActionEntries<T>` states an invariant construction just
	// established. Typed reads (`getState`) resolve through this view with no
	// per-read cast, and the write gate in `updateAction` keeps the invariant
	// true across every later write.
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see comment above; the per-action entry kinds are not expressible on the runtime record
	const typedEntries = entries as ActionEntries<T>;

	return {
		axis1d(action) {
			const value = readValue(entries, action);
			assert(typeIs(value, "number"), "axis1d read must be a number");
			return value;
		},
		axis3d(action) {
			const value = readValue(entries, action);
			assert(typeIs(value, "Vector3"), "axis3d read must be a Vector3");
			return value;
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
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see comment above; the generic per-action token type is not runtime-checkable
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
			if (isDebug && _G.__DEV__) {
				return listDebugCaptures(entries, action);
			}

			return NO_DEBUG_CAPTURES;
		},
		direction2d(action) {
			const value = readValue(entries, action);
			assert(typeIs(value, "Vector2"), "direction2d read must be a Vector2");
			return value;
		},
		getState<A extends keyof T & string>(action: A): ActionValue<T, A> {
			if (isDebug && _G.__DEV__) {
				// Dev-mode friendly error for an untyped caller passing a bogus
				// action name; asserts are stripped from production builds,
				// where the bad name surfaces as an index-nil error instead.
				getEntry(entries, action);
			}

			return readEntryValue(typedEntries[action]);
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
			const value = readValue(entries, action);
			assert(typeIs(value, "Vector2"), "position2d read must be a Vector2");
			return value;
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

function endFrame(entries: Record<string, ActionEntry>): void {
	for (const [, entry] of pairs(entries)) {
		entry.previousValue = entry.value;
		entry.previousTriggerState = entry.triggerState;
		consumeFrameClaim(entry);
		settleDrain(entry);
	}
}

function setEnabled(entries: Record<string, ActionEntry>, action: string, enabled: boolean): void {
	getEntry(entries, action).enabled = enabled;
}

function updateAction(entries: Record<string, ActionEntry>, options: UpdateActionOptions): void {
	const entry = getEntry(entries, options.action);

	// The write gate maintaining the entry invariant every typed read relies
	// on: a stored value always matches its entry's kind. Values arrive here
	// from the engine, from `simulateAction`, and from user modifiers — all
	// of which the compiler cannot vouch for at this boundary.
	assert(
		isActionValueOfKind(entry.kind, options.value),
		`value written to "${options.action}" does not match its action type "${entry.kind}"`,
	);
	entry.value = options.value;

	if (options.triggerState !== entry.triggerState) {
		entry.previousDuration = entry.duration;
		entry.duration = options.triggerState === "none" ? 0 : options.deltaTime;
	} else if (options.triggerState !== "none") {
		entry.duration += options.deltaTime;
	}

	entry.triggerState = options.triggerState;
}

function buildInternalState(entries: Record<string, ActionEntry>): InternalActionState {
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
