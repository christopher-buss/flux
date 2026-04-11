import type { Tagged } from "type-fest";

import type { ActionMap, AllActions } from "./actions";
import type { BindingForAction, BindingState } from "./bindings";
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
 * @template Contexts - Union of valid context name literals.
 */
export interface FluxCore<Actions extends ActionMap = ActionMap, Contexts extends string = string> {
	/**
	 * Activates a context for the given handle.
	 * @param handle - The input consumer handle.
	 * @param context - The context name to activate.
	 * @returns A cancel function that disconnects any ChildAdded listeners
	 * (no-op for owned handles).
	 * @throws Error if the context is already active for this handle.
	 */
	addContext(handle: InputHandle, context: Contexts): () => void;

	/**
	 * Tears down the core instance and releases all resources.
	 */
	destroy(): void;

	/**
	 * Returns the list of active contexts for the given handle.
	 * @param handle - The input consumer handle.
	 * @returns Read-only array of active context names.
	 */
	getContexts(handle: InputHandle): ReadonlyArray<Contexts>;

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
	hasContext(handle: InputHandle, context: Contexts): boolean;

	/**
	 * Loads serialized bindings for the given handle, merging with defaults.
	 * @param handle - The input consumer handle.
	 * @param data - The serialized binding state to load.
	 */
	loadBindings(handle: InputHandle, data: BindingState<Actions>): void;

	/**
	 * Replaces all bindings for a single action.
	 * @template A - The action name.
	 * @param handle - The input consumer handle.
	 * @param action - The action to rebind.
	 * @param bindings - The new bindings for the action.
	 */
	rebind<A extends AllActions<Actions>>(
		handle: InputHandle,
		action: A,
		bindings: ReadonlyArray<BindingForAction<Actions[A]["type"]>>,
	): void;

	/**
	 * Replaces all bindings for all actions at once.
	 * @param handle - The input consumer handle.
	 * @param bindings - The complete binding state to apply.
	 */
	rebindAll(handle: InputHandle, bindings: BindingState<Actions>): void;

	/**
	 * Registers a new input consumer, creating IAS instances under the parent.
	 * @param parent - The instance to parent InputContexts under.
	 * @param context - First context name to activate (at least one required).
	 * @param contexts - Additional context names to activate.
	 * @returns An opaque handle identifying the consumer.
	 */
	register(
		parent: Instance,
		context: Contexts,
		...contexts: ReadonlyArray<Contexts>
	): InputHandle;

	/**
	 * Registers a new input consumer using an externally-provided handle.
	 *
	 * Use when the caller manages handle identity (e.g., ECS entity IDs).
	 *
	 * @param handle - The externally-provided handle to register under.
	 * @param parent - The instance to parent InputContexts under.
	 * @param context - First context name to activate (at least one required).
	 * @param contexts - Additional context names to activate.
	 * @throws HandleError if handle is already registered.
	 */
	registerAs(
		handle: InputHandle,
		parent: Instance,
		context: Contexts,
		...contexts: ReadonlyArray<Contexts>
	): void;

	/**
	 * Deactivates a context for the given handle.
	 * @param handle - The input consumer handle.
	 * @param context - The context name to deactivate.
	 * @throws Error if the context is not active for this handle.
	 */
	removeContext(handle: InputHandle, context: Contexts): void;

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
	 * Serializes the handle's active binding overrides for persistence.
	 *
	 * The result is sparse: only actions with an explicit override appear.
	 * Unchanged actions are absent and, on `loadBindings`, are restored from
	 * the current code's default context bindings. This lets multi-context
	 * actions keep their per-context defaults across a save/load cycle
	 * without flattening them into a single shared list. Suitable for
	 * DataStore persistence of user customizations.
	 * @param handle - The input consumer handle.
	 * @returns A sparse record of overridden bindings keyed by action name.
	 * @throws FluxError if called on a subscribed handle.
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
	 * Subscribes to server-created IAS instances under the parent.
	 * Uses FindFirstChild + ChildAdded to discover existing and incoming instances.
	 * @param parent - The instance containing server-created InputContexts.
	 * @param context - First context name to subscribe to (at least one required).
	 * @param contexts - Additional context names to subscribe to.
	 * @returns A tuple of the handle and a cancel function that disconnects
	 * ChildAdded listeners.
	 */
	subscribe(
		parent: Instance,
		context: Contexts,
		...contexts: ReadonlyArray<Contexts>
	): [InputHandle, () => void];

	/**
	 * Subscribes to server-created IAS instances using an externally-provided handle.
	 *
	 * @param handle - The externally-provided handle to register under.
	 * @param parent - The instance containing server-created InputContexts.
	 * @param context - First context name to subscribe to (at least one required).
	 * @param contexts - Additional context names to subscribe to.
	 * @returns A cancel function that disconnects ChildAdded listeners.
	 * @throws HandleError if handle is already registered.
	 */
	subscribeAs(
		handle: InputHandle,
		parent: Instance,
		context: Contexts,
		...contexts: ReadonlyArray<Contexts>
	): () => void;

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
