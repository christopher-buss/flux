import type { Tagged } from "type-fest";

import type { ActionMap, AllActions } from "./actions";
import type { BindingLike, BindingState } from "./bindings";
import type { ActionState, ActionValue } from "./state";

/**
 * Opaque handle identifying a registered input consumer.
 *
 * @remarks
 * Core operates on handles rather than players or entities. Integration layers
 * (ECS, React) map their own concepts to handles via {@link InputHandle}.
 * Created by {@link FluxCore.register} and invalidated by {@link FluxCore.unregister}.
 */
export type InputHandle = Tagged<number, "InputHandle">;

/**
 * Core runtime interface for the Flux input system.
 *
 * Manages input consumers via opaque handles, context switching,
 * binding configuration, and per-frame state queries.
 *
 * @template Actions - The action map defining available input actions.
 */
export interface FluxCore<Actions extends ActionMap = ActionMap> {
	/**
	 * Activates a context for the given handle.
	 * @param handle - The input consumer handle.
	 * @param context - The context name to activate.
	 */
	addContext(handle: InputHandle, context: string): void;

	/**
	 * Tears down the core instance and releases all resources.
	 */
	destroy(): void;

	/**
	 * Returns the list of active contexts for the given handle.
	 * @param handle - The input consumer handle.
	 * @returns Read-only array of active context names.
	 */
	getContexts(handle: InputHandle): ReadonlyArray<string>;

	/**
	 * Returns the action state query interface for the given handle.
	 * @param handle - The input consumer handle.
	 * @returns The typed action state for querying input.
	 */
	getState(handle: InputHandle): ActionState<Actions>;

	/**
	 * Checks whether a context is active for the given handle.
	 * @param handle - The input consumer handle.
	 * @param context - The context name to check.
	 * @returns True if the context is active.
	 */
	hasContext(handle: InputHandle, context: string): boolean;

	/**
	 * Loads serialized bindings for the given handle, merging with defaults.
	 * @param handle - The input consumer handle.
	 * @param data - The serialized binding state to load.
	 */
	loadBindings(handle: InputHandle, data: BindingState<Actions>): void;

	/**
	 * Replaces all bindings for a single action.
	 * @param handle - The input consumer handle.
	 * @param action - The action to rebind.
	 * @param bindings - The new bindings for the action.
	 */
	rebind(
		handle: InputHandle,
		action: AllActions<Actions>,
		bindings: ReadonlyArray<BindingLike>,
	): void;

	/**
	 * Replaces all bindings for all actions at once.
	 * @param handle - The input consumer handle.
	 * @param bindings - The complete binding state to apply.
	 */
	rebindAll(handle: InputHandle, bindings: BindingState<Actions>): void;

	/**
	 * Registers a new input consumer with the given initial contexts.
	 * @param context - First context name to activate (at least one required).
	 * @param contexts - Additional context names to activate.
	 * @returns An opaque handle identifying the consumer.
	 */
	register(context: string, ...contexts: ReadonlyArray<string>): InputHandle;

	/**
	 * Deactivates a context for the given handle.
	 * @param handle - The input consumer handle.
	 * @param context - The context name to deactivate.
	 */
	removeContext(handle: InputHandle, context: string): void;

	/**
	 * Resets all action bindings for the given handle to their defaults.
	 * @param handle - The input consumer handle.
	 */
	resetAllBindings(handle: InputHandle): void;

	/**
	 * Resets bindings for a single action to its default.
	 * @param handle - The input consumer handle.
	 * @param action - The action whose bindings to reset.
	 */
	resetBindings(handle: InputHandle, action: AllActions<Actions>): void;

	/**
	 * Serializes current bindings for persistence or network transfer.
	 * @param handle - The input consumer handle.
	 * @returns The serialized binding state.
	 */
	serializeBindings(handle: InputHandle): BindingState<Actions>;

	/**
	 * Injects a synthetic action value for testing or replay.
	 * @template A - The action name.
	 * @param handle - The input consumer handle.
	 * @param action - The action to simulate.
	 * @param state - The value to inject, matching the action's type.
	 */
	simulateAction<A extends AllActions<Actions>>(
		handle: InputHandle,
		action: A,
		state: ActionValue<Actions, A>,
	): void;

	/**
	 * Unregisters an input consumer, releasing its handle.
	 * @param handle - The handle to invalidate.
	 */
	unregister(handle: InputHandle): void;

	/**
	 * Advances the input system by one frame.
	 * @param deltaTime - Time elapsed since last frame in seconds.
	 */
	update(deltaTime: number): void;
}
