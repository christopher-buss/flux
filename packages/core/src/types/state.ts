import type {
	ActionConfig,
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
	Bool: boolean;
	Direction1D: number;
	Direction2D: Vector2;
	Direction3D: Vector3;
	ViewportPosition: Vector2;
	/* eslint-enable flawless/naming-convention */
}

/**
 * Resolves the runtime value type for a specific action in an action map.
 * @template Actions - The action map containing the action.
 * @template A - The action name to resolve.
 */
export type ActionValue<Actions extends ActionMap, A extends AllActions<Actions>> =
	Actions[A] extends ActionConfig<infer T> ? ActionValueMap[T] : never;

/**
 * Query interface for input state per handle.
 *
 * Methods are constrained by action type so that only valid queries compile.
 * Bool-only methods like `pressed` reject axis actions at compile time.
 *
 * @template Actions - The action map constraining available queries.
 */
export interface ActionState<Actions extends ActionMap = ActionMap> {
	/**
	 * Returns the current scalar value of a 1D directional action.
	 * @param action - A Direction1D action name.
	 * @returns The current axis value.
	 */
	axis1d(action: Direction1dActions<Actions>): number;

	/**
	 * Returns the current vector value of a 3D directional action.
	 * @param action - A Direction3D action name.
	 * @returns The current 3D axis value.
	 */
	axis3d(action: Direction3dActions<Actions>): Vector3;

	/**
	 * Whether the axis action transitioned from inactive to active this frame.
	 * @param action - An axis action name (1D, 2D, or 3D).
	 * @returns True if the axis just became active.
	 */
	axisBecameActive(action: AxisActions<Actions>): boolean;

	/**
	 * Whether the axis action transitioned from active to inactive this frame.
	 * @param action - An axis action name (1D, 2D, or 3D).
	 * @returns True if the axis just became inactive.
	 */
	axisBecameInactive(action: AxisActions<Actions>): boolean;

	/**
	 * Whether the action's trigger was canceled this frame.
	 * @param action - Any action name.
	 * @returns True if the action was canceled.
	 */
	canceled(action: AllActions<Actions>): boolean;

	/**
	 * Claims exclusive ownership of an action, preventing other consumers from reading it.
	 * @param action - Any action name.
	 * @returns True if the claim succeeded (not already claimed by another consumer).
	 */
	claim(action: AllActions<Actions>): boolean;

	/**
	 * Returns how long the current trigger state has been active in seconds.
	 * @param action - Any action name.
	 * @returns Duration in seconds.
	 */
	currentDuration(action: AllActions<Actions>): number;

	/**
	 * Returns the current 2D directional vector of a Direction2D action.
	 * @param action - A Direction2D action name.
	 * @returns The current 2D direction value.
	 */
	direction2d(action: Direction2dActions<Actions>): Vector2;

	/**
	 * Returns the typed runtime value for any action.
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
	 * @param action - Any action name.
	 * @returns True if the action is currently claimed.
	 */
	isClaimed(action: AllActions<Actions>): boolean;

	/**
	 * Whether the action is enabled in its configuration.
	 * @param action - Any action name.
	 * @returns True if the action is enabled.
	 */
	isEnabled(action: AllActions<Actions>): boolean;

	/**
	 * Whether a boolean action transitioned from released to pressed this frame.
	 * @param action - A Bool action name.
	 * @returns True if the action was just pressed.
	 */
	justPressed(action: BoolActions<Actions>): boolean;

	/**
	 * Whether a boolean action transitioned from pressed to released this frame.
	 * @param action - A Bool action name.
	 * @returns True if the action was just released.
	 */
	justReleased(action: BoolActions<Actions>): boolean;

	/**
	 * Whether the action's trigger is currently ongoing (started but not yet completed).
	 * @param action - Any action name.
	 * @returns True if the action's trigger is ongoing.
	 */
	ongoing(action: AllActions<Actions>): boolean;

	/**
	 * Returns the screen-space position of a ViewportPosition action.
	 * @param action - A ViewportPosition action name.
	 * @returns The current viewport position.
	 */
	position2d(action: ViewportPositionActions<Actions>): Vector2;

	/**
	 * Whether a boolean action is currently held down.
	 * @param action - A Bool action name.
	 * @returns True if the action is pressed.
	 */
	pressed(action: BoolActions<Actions>): boolean;

	/**
	 * Returns how long the previous trigger state lasted in seconds.
	 * @param action - Any action name.
	 * @returns Duration in seconds.
	 */
	previousDuration(action: AllActions<Actions>): number;

	/**
	 * Whether the action's trigger conditions were met this frame.
	 * @param action - Any action name.
	 * @returns True if the action was triggered.
	 */
	triggered(action: AllActions<Actions>): boolean;
}
