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
 * Query interface for input state per handle.
 *
 * Methods are constrained by action type so that only valid queries compile.
 * Bool-only methods like `pressed` reject axis actions at compile time.
 *
 * @remarks Every processed read is claim-aware: once a consumer calls
 * {@link ActionState.claim}, boolean and edge reads return false, value reads
 * return the action type's neutral value, and durations return 0 for the rest
 * of the frame. Claims clear at the start of the next `core.update`, so a claim
 * made before an update is wiped by that update. Only
 * {@link ActionState.rawPressed} and {@link ActionState.rawJustPressed} bypass
 * claims.
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
	 * Whether the action's trigger was canceled this frame.
	 * @remarks Returns false while the action is claimed.
	 * @param action - Any action name.
	 * @returns True if the action was canceled.
	 */
	canceled(action: AllActions<Actions>): boolean;

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
	 * @example
	 * ```ts
	 * if (input.justPressed("interact") && input.claim("interact")) {
	 * 	// act — downstream consumers see the action as inert this frame
	 * }
	 * ```
	 * @param action - Any action name.
	 * @returns True if the claim succeeded (not already claimed this frame).
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
	 * too.
	 * @param action - A Bool action name.
	 * @returns True if the trigger just stopped firing.
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
