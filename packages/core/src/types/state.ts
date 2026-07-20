import type {
	ActionMap,
	AllActions,
	AxisActions,
	BoolActions,
	Direction1dActions,
	Direction2dActions,
	Direction3dActions,
	ViewportPositionActions,
} from "./actions";

/**
 * Maps each ActionType to its runtime value type.
 * @remarks Used by {@link ActionValue} to resolve the concrete type a query method returns.
 */
export interface ActionValueMap {
	/* eslint-disable flawless/naming-convention -- Matches Roblox API. */
	/** Boolean on/off state. */
	Bool: boolean;
	/** Scalar axis value. */
	Direction1D: number;
	/** 2D directional vector. */
	Direction2D: Vector2;
	/** 3D directional vector. */
	Direction3D: Vector3;
	/** Screen-space pointer position. */
	ViewportPosition: Vector2;
	/* eslint-enable flawless/naming-convention */
}

/**
 * Resolves the runtime value type for a specific action in an action map.
 * @template Actions - The action map containing the action.
 * @template A - The action name to resolve.
 */
export type ActionValue<
	Actions extends ActionMap,
	A extends AllActions<Actions>,
> = ActionValueMap[Actions[A]["type"]];

/**
 * Options accepted by {@link ActionState.capture}.
 * @remarks Reserved extension point — future fields (such as a priority tier)
 * land here without changing the signature.
 */
export interface CaptureOptions {
	/**
	 * Optional label recorded on the capture's {@link DebugCapture} entry, to
	 * disambiguate holders when every acquisition routes through one shared
	 * helper and the tracebacks look identical.
	 * @remarks Dev-mode only: outside development mode the label is not
	 * recorded, and {@link ActionState.debugCaptures} never surfaces it.
	 */
	readonly debugLabel?: string;
}

/**
 * One holder on an action's capture stack, as reported by
 * {@link ActionState.debugCaptures}.
 */
export interface DebugCapture {
	/** The `debugLabel` supplied at acquisition, if any. */
	readonly label?: string;
	/** The traceback recorded automatically at the `capture()` call site. */
	readonly traceback: string;
}

/**
 * A standing, exclusive, reader-side hold on one action, returned by
 * {@link ActionState.capture}.
 *
 * The token *is* the scoped reader: it carries every processed read with the
 * action pre-bound, narrowed to the action's kind — `axis1d()` on a Bool
 * action does not compile. Captures stack LIFO: the newest token reads the
 * action's real state, while shadowed tokens and every other consumer read
 * it as inert. `raw*` reads are absent: raw bypasses captures by definition,
 * so they stay on {@link ActionState.rawPressed} and never route through a
 * token.
 *
 * @example
 * ```ts
 * const confirm = state.capture("confirm");
 * // ...frames pass; only this token sees the real action state...
 * if (confirm.justPressed()) {
 * 	acceptDialog();
 * }
 * confirm.release();
 * ```
 * @template Actions - The action map containing the captured action.
 * @template A - The captured action name, used to narrow the read surface.
 */
export type CaptureToken<
	Actions extends ActionMap,
	A extends AllActions<Actions>,
> = (A extends AxisActions<Actions> ? CaptureTokenAxisReads : unknown) &
	(A extends BoolActions<Actions> ? CaptureTokenBoolReads : unknown) &
	(A extends Direction1dActions<Actions> ? CaptureTokenDirection1dReads : unknown) &
	(A extends Direction2dActions<Actions> ? CaptureTokenDirection2dReads : unknown) &
	(A extends Direction3dActions<Actions> ? CaptureTokenDirection3dReads : unknown) &
	(A extends ViewportPositionActions<Actions> ? CaptureTokenViewportPositionReads : unknown) &
	CaptureTokenBase<Actions, A>;

/**
 * Query interface for input state per handle.
 *
 * Methods are constrained by action type so that only valid queries compile.
 * Bool-only methods like `pressed` reject axis actions at compile time.
 *
 * @remarks Every processed read is suppression-aware: a read reports its
 * suppressed result while the action is claimed, or while it is captured and
 * the reader is not the capture holder. Suppressed boolean and edge reads
 * return false, value reads return the action type's neutral value, and
 * durations return 0. Claims clear at the start of the next `core.update`, so
 * a claim made before an update is wiped by that update; captures persist
 * until released. Only {@link ActionState.rawPressed} and
 * {@link ActionState.rawJustPressed} bypass claims and captures.
 * @template Actions - The action map constraining available queries.
 * @see https://create.roblox.com/docs/reference/engine/classes/InputAction
 */
export interface ActionState<Actions extends ActionMap = ActionMap> {
	/**
	 * Returns the current scalar value of a 1D directional action.
	 * @remarks Returns 0 while the action is claimed.
	 * @param action - A Direction1D action name.
	 * @returns The current axis value.
	 */
	axis1d(action: Direction1dActions<Actions>): number;

	/**
	 * Returns the current vector value of a 3D directional action.
	 * @remarks Returns `Vector3.zero` while the action is claimed.
	 * @param action - A Direction3D action name.
	 * @returns The current 3D axis value.
	 */
	axis3d(action: Direction3dActions<Actions>): Vector3;

	/**
	 * Whether the axis action transitioned from inactive to active this frame.
	 * @remarks Returns false while the action is claimed.
	 * @param action - An axis action name (1D, 2D, or 3D).
	 * @returns True if the axis just became active.
	 */
	axisBecameActive(action: AxisActions<Actions>): boolean;

	/**
	 * Whether the axis action transitioned from active to inactive this frame.
	 * @remarks Returns false while the action is claimed.
	 * @param action - An axis action name (1D, 2D, or 3D).
	 * @returns True if the axis just became inactive.
	 */
	axisBecameInactive(action: AxisActions<Actions>): boolean;

	/**
	 * Whether the action was canceled this frame.
	 *
	 * Two composing sources: the action's trigger reported "canceled", or a
	 * capture boundary force-dropped this reader's visible in-flight view —
	 * for example a capture acquired while a press was in flight. The
	 * boundary cancel reads true for exactly one frame and only for the
	 * displaced reader; consumers already reading flat get nothing. Two
	 * boundaries in one frame keep only the last displaced viewer.
	 *
	 * "In flight" means non-zero magnitude, matching the release drain. A
	 * trigger that fires at magnitude zero — a tap firing on the release
	 * edge, say — is not in flight, so a boundary over it cancels nothing.
	 * @remarks Returns false while the action is claimed — a claim eats the
	 * boundary cancel like any other processed read.
	 * @param action - Any action name.
	 * @returns True if the action was canceled.
	 * @example
	 * ```ts
	 * // Abandon a charge-up when the press is interrupted — by the
	 * // trigger, or by a menu capturing "fire" mid-charge.
	 * if (input.canceled("fire")) {
	 * 	abandonCharge();
	 * }
	 * ```
	 */
	canceled(action: AllActions<Actions>): boolean;

	/**
	 * Acquires a standing, exclusive, reader-side hold on one action.
	 *
	 * The returned {@link CaptureToken} is a scoped reader for the action:
	 * `token.pressed()`, no action argument. While the capture is held, the
	 * token reads the action's real state and every other consumer reads it
	 * as inert — for every processed read kind. Unlike a claim, the hold
	 * survives `core.update`; it lasts until {@link CaptureToken.release} or
	 * until the handle is unregistered. Only {@link ActionState.rawPressed}
	 * and {@link ActionState.rawJustPressed} see through a capture.
	 *
	 * Capturing an already-captured action succeeds and stacks LIFO: the new
	 * token shadows the holders beneath it, which read inert until it
	 * releases. Every call pushes a fresh independent token — core tracks no
	 * caller identity, so deduplication is the caller's concern.
	 *
	 * @example
	 * ```ts
	 * // A modal owns "confirm" for its whole lifetime.
	 * const confirm = state.capture("confirm");
	 * // ...only `confirm` sees the real action state...
	 * confirm.release();
	 * ```
	 * @template A - The action name, used to narrow the token's read surface.
	 * @param action - Any action name.
	 * @param options - Reserved options bag; no options are defined yet.
	 * @returns A capture token scoped to the action.
	 */
	capture<A extends AllActions<Actions>>(
		action: A,
		options?: CaptureOptions,
	): CaptureToken<Actions, A>;

	/**
	 * Marks the action as consumed for the rest of the frame, so every processed
	 * read returns false or the type's neutral value.
	 *
	 * The claim flag carries no owner identity, so claiming before reading
	 * suppresses your own reads. Always read first, then claim — priority comes
	 * from the order consumers run in. Claims clear at the start of the next
	 * `core.update`, so continuous input must be re-claimed each frame.
	 *
	 * Claim only what you used. "This consumer owns the action regardless of
	 * input" is a job for a higher-priority context with `sink`, not a claim.
	 *
	 * @param action - Any action name.
	 * @returns True if the claim succeeded (not already claimed this frame).
	 * @example
	 * ```ts
	 * if (input.justPressed("interact") && input.claim("interact")) {
	 * 	// act — downstream consumers see the action as inert this frame
	 * }
	 * ```
	 */
	claim(action: AllActions<Actions>): boolean;

	/**
	 * Returns how long the current trigger state has been active in seconds.
	 * @remarks Returns 0 while the action is claimed.
	 * @param action - Any action name.
	 * @returns Duration in seconds.
	 */
	currentDuration(action: AllActions<Actions>): number;

	/**
	 * Returns the action's capture stack for debugging, bottom-to-top — the
	 * last entry is the active holder.
	 *
	 * Dev-mode introspection for finding which surface is holding a dead
	 * action: each entry carries the traceback recorded automatically at its
	 * `capture()` call site, plus the optional
	 * {@link CaptureOptions.debugLabel} supplied at acquisition.
	 *
	 * @remarks Strictly dev-mode: returns an empty array unless `_G.__DEV__`
	 * is true and the core was created with `debug: true`, so shipped game
	 * code cannot branch on capture status.
	 * @example
	 * ```ts
	 * for (const { label, traceback } of state.debugCaptures("confirm")) {
	 * 	print(label ?? "<unlabeled>", traceback);
	 * }
	 * ```
	 * @param action - Any action name.
	 * @returns The capture stack bottom-to-top; empty outside dev mode.
	 */
	debugCaptures(action: AllActions<Actions>): ReadonlyArray<DebugCapture>;

	/**
	 * Returns the current 2D directional vector of a Direction2D action.
	 * @remarks Returns `Vector2.zero` while the action is claimed.
	 * @param action - A Direction2D action name.
	 * @returns The current 2D direction value.
	 */
	direction2d(action: Direction2dActions<Actions>): Vector2;

	/**
	 * Returns the typed runtime value for any action.
	 * @remarks Returns the action type's neutral value while the action is
	 * claimed: false, 0, `Vector2.zero`, or `Vector3.zero`.
	 * @template A - The action name, used to resolve the return type.
	 * @param action - Any action name.
	 * @returns The action's current value with its correct type.
	 */
	getState<A extends AllActions<Actions>>(action: A): ActionValue<Actions, A>;

	/**
	 * Whether the action exists and is reachable in the current context stack.
	 * @param action - Any action name.
	 * @returns True if the action is available.
	 */
	isAvailable(action: AllActions<Actions>): boolean;

	/**
	 * Whether the action has been claimed by any consumer.
	 * @remarks Unaffected by claims — this is how you observe them.
	 * @param action - Any action name.
	 * @returns True if the action is currently claimed.
	 */
	isClaimed(action: AllActions<Actions>): boolean;

	/**
	 * Whether the action is enabled in its configuration.
	 * @remarks Unaffected by claims.
	 * @param action - Any action name.
	 * @returns True if the action is enabled.
	 */
	isEnabled(action: AllActions<Actions>): boolean;

	/**
	 * Whether a boolean action's trigger transitioned to "triggered" this frame.
	 * @remarks Returns false while the action is claimed.
	 * @param action - A Bool action name.
	 * @returns True if the trigger just fired.
	 */
	justPressed(action: BoolActions<Actions>): boolean;

	/**
	 * Whether a boolean action's trigger transitioned from "triggered" this frame.
	 * @remarks Returns false while the action is claimed. A claimed press frame
	 * is still followed by a visible release frame unless that frame is claimed
	 * too — a per-frame guarantee only: `justReleased` is lossy by contract
	 * across a capture boundary. A press force-dropped by a capture produces a
	 * one-frame {@link ActionState.canceled}, never a synthesized release.
	 * @param action - A Bool action name.
	 * @returns True if the trigger just stopped firing.
	 * @example
	 * ```ts
	 * // Fire on a completed release; treat an interrupted one separately.
	 * if (input.justReleased("fire")) {
	 * 	releaseChargedShot();
	 * } else if (input.canceled("fire")) {
	 * 	abandonCharge();
	 * }
	 * ```
	 */
	justReleased(action: BoolActions<Actions>): boolean;

	/**
	 * Whether the action's trigger is currently ongoing (started but not yet completed).
	 * @remarks Returns false while the action is claimed.
	 * @param action - Any action name.
	 * @returns True if the action's trigger is ongoing.
	 */
	ongoing(action: AllActions<Actions>): boolean;

	/**
	 * Returns the screen-space position of a ViewportPosition action.
	 * @remarks Returns `Vector2.zero` while the action is claimed.
	 * @param action - A ViewportPosition action name.
	 * @returns The current viewport position.
	 */
	position2d(action: ViewportPositionActions<Actions>): Vector2;

	/**
	 * Whether a boolean action's trigger is currently "triggered".
	 * @remarks Returns false while the action is claimed.
	 * @param action - A Bool action name.
	 * @returns True if the trigger is active.
	 */
	pressed(action: BoolActions<Actions>): boolean;

	/**
	 * Returns how long the previous trigger state lasted in seconds.
	 * @remarks Returns 0 while the action is claimed.
	 * @param action - Any action name.
	 * @returns Duration in seconds.
	 */
	previousDuration(action: AllActions<Actions>): number;

	/**
	 * Whether the raw input value transitioned from false to true this frame.
	 *
	 * @remarks Pre-arbitration: bypasses both trigger evaluation and claims.
	 * Prefer {@link ActionState.justPressed} unless you specifically need raw
	 * input detection.
	 * @param action - A Bool action name.
	 * @returns True if the raw value just became true.
	 */
	rawJustPressed(action: BoolActions<Actions>): boolean;

	/**
	 * Whether the raw input value is currently true.
	 *
	 * @remarks Pre-arbitration: bypasses both trigger evaluation and claims.
	 * Prefer {@link ActionState.pressed} unless you specifically need raw input
	 * detection.
	 * @param action - A Bool action name.
	 * @returns True if the raw value is true.
	 */
	rawPressed(action: BoolActions<Actions>): boolean;

	/**
	 * Whether the action's trigger conditions were met this frame.
	 * @remarks Returns false while the action is claimed.
	 * @param action - Any action name.
	 * @returns True if the action was triggered.
	 */
	triggered(action: AllActions<Actions>): boolean;
}

/**
 * Reads available on every capture token regardless of action kind.
 *
 * Mirrors the corresponding {@link ActionState} reads with the action
 * pre-bound, so no action argument is taken.
 *
 * @template Actions - The action map containing the captured action.
 * @template A - The captured action name.
 */
interface CaptureTokenBase<Actions extends ActionMap, A extends AllActions<Actions>> {
	/**
	 * Whether the captured action was canceled this frame.
	 *
	 * Two composing sources: the action's trigger reported "canceled", or a
	 * capture boundary force-dropped this token's visible in-flight view —
	 * the token was shadowed by a newer capture, or released mid-press
	 * itself. The boundary cancel reads true for exactly one frame; a token
	 * already reading flat gets nothing.
	 *
	 * "In flight" means non-zero magnitude, matching the release drain, so a
	 * trigger firing at magnitude zero is not in flight and cancels nothing.
	 * @remarks Returns false while the action is claimed — a claim eats the
	 * boundary cancel like any other processed read.
	 * @returns True if the action was canceled.
	 * @example
	 * ```ts
	 * // A drag started inside this surface is abandoned when another
	 * // surface captures over it, or when the token releases mid-drag.
	 * if (drag.canceled()) {
	 * 	abandonDrag();
	 * }
	 * ```
	 */
	canceled(): boolean;

	/**
	 * Marks the captured action as consumed for the rest of the frame.
	 *
	 * Behaves exactly like {@link ActionState.claim}: the claim carries no
	 * owner identity, so it suppresses the holder's own reads too — read
	 * first, then claim. Claims clear at the start of the next `core.update`.
	 *
	 * @returns True if the claim succeeded (not already claimed this frame).
	 */
	claim(): boolean;

	/**
	 * Returns how long the current trigger state has been active in seconds.
	 * @returns Duration in seconds.
	 */
	currentDuration(): number;

	/**
	 * Returns the captured action's typed runtime value.
	 * @returns The action's current value with its correct type.
	 */
	getState(): ActionValue<Actions, A>;

	/**
	 * Whether the captured action's trigger is currently ongoing.
	 * @returns True if the action's trigger is ongoing.
	 */
	ongoing(): boolean;

	/**
	 * Returns how long the previous trigger state lasted in seconds.
	 * @returns Duration in seconds.
	 */
	previousDuration(): number;

	/**
	 * Releases the capture, restoring the holder beneath it in the same
	 * frame — or normal reads for every consumer if none remains.
	 * @remarks Removes only this token's slot in the stack, so releasing a
	 * shadowed token out of order leaves the top holder unaffected.
	 * Releasing an already-released token is a silent no-op, so defensive
	 * cleanup code is harmless.
	 */
	release(): void;

	/**
	 * Whether the captured action's trigger conditions were met this frame.
	 * @returns True if the action was triggered.
	 */
	triggered(): boolean;
}

/** Direction1D reads available on a capture token. */
interface CaptureTokenDirection1dReads {
	/**
	 * Returns the captured action's current scalar value.
	 * @returns The current axis value.
	 */
	axis1d(): number;
}

/** Direction3D reads available on a capture token. */
interface CaptureTokenDirection3dReads {
	/**
	 * Returns the captured action's current vector value.
	 * @returns The current 3D axis value.
	 */
	axis3d(): Vector3;
}

/** Axis edge reads available on a capture token for directional actions. */
interface CaptureTokenAxisReads {
	/**
	 * Whether the captured axis transitioned from inactive to active this
	 * frame.
	 * @returns True if the axis just became active.
	 */
	axisBecameActive(): boolean;

	/**
	 * Whether the captured axis transitioned from active to inactive this
	 * frame.
	 * @returns True if the axis just became inactive.
	 */
	axisBecameInactive(): boolean;
}

/** Bool reads available on a capture token. */
interface CaptureTokenBoolReads {
	/**
	 * Whether the captured action's trigger transitioned to "triggered" this
	 * frame.
	 * @returns True if the trigger just fired.
	 */
	justPressed(): boolean;

	/**
	 * Whether the captured action's trigger transitioned from "triggered"
	 * this frame.
	 * @remarks Lossy by contract across a capture boundary: a force-dropped
	 * press produces a one-frame cancel, never a synthesized release.
	 * @returns True if the trigger just stopped firing.
	 */
	justReleased(): boolean;

	/**
	 * Whether the captured action's trigger is currently "triggered".
	 * @returns True if the trigger is active.
	 */
	pressed(): boolean;
}

/** Direction2D reads available on a capture token. */
interface CaptureTokenDirection2dReads {
	/**
	 * Returns the captured action's current 2D directional vector.
	 * @returns The current 2D direction value.
	 */
	direction2d(): Vector2;
}

/** ViewportPosition reads available on a capture token. */
interface CaptureTokenViewportPositionReads {
	/**
	 * Returns the captured action's screen-space position.
	 * @returns The current viewport position.
	 */
	position2d(): Vector2;
}
