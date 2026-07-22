import type { Tagged } from "type-fest";

import type { InputPlatform } from "../bindings/classify";
import type { ActionMap, AllActions } from "./actions";
import type {
	BindingForAction,
	BindingLike,
	BindingOrigin,
	BindingState,
	RebindPlatform,
} from "./bindings";
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
	 * Returns the effective bindings for all actions.
	 *
	 * Each action maps to its merged bindings (defaults + overrides).
	 * If a context is specified, returns only bindings from that context.
	 *
	 * @param handle - The input consumer handle.
	 * @param context - Optional context to scope the query.
	 * @returns A record mapping every action name to its effective bindings.
	 */
	getAllBindings(
		handle: InputHandle,
		context?: Contexts,
	): Record<AllActions<Actions>, ReadonlyArray<BindingLike>>;

	/**
	 * Reports where one platform's bindings for an action come from.
	 *
	 * `getBindings` returns an empty list for two unrelated facts — the player
	 * unbound the action, and the context never declared it — which a settings
	 * screen must render differently. This separates them without
	 * cross-referencing `getContextInfo().actions`.
	 *
	 * Reads per platform because overrides are written per platform: keyboard
	 * can be an override while gamepad is still a default. Unlike
	 * `rebindForPlatform` this accepts `"touch"` — touch is not writable per
	 * platform, but a whole-action `rebind` does write a touch bucket, so a
	 * touch row still has an origin worth asking about.
	 *
	 * **Precedence.** Naming a context makes that context's declaration
	 * outrank everything:
	 * an action that context does not declare reads `"undeclared"` even when
	 * the handle carries an override for it. Overrides are keyed by action
	 * rather than by context, so an action can hold one while a given context
	 * never declared it — and that context has no `InputAction` for the
	 * action, so the override does not reach it. Naming no context drops the
	 * gate: an override wins, and the action counts as declared when any
	 * active context declares it.
	 *
	 * An action is declared when the context binds it *and* the core's action
	 * map knows it, which is the same test behind `getContextInfo().actions`.
	 * @param handle - The input consumer handle.
	 * @param action - The action name to query.
	 * @param platform - The platform whose row is being rendered.
	 * @param context - Optional context to scope the query.
	 * @returns `"undeclared"` when the scoped context does not declare the
	 * action; `"override"` when the player customized this platform, counting
	 * a deliberate unbind; `"default"` when it tracks the code-defined
	 * bindings.
	 * @throws If the context name is unknown.
	 * @example
	 * core.rebindForPlatform(handle, "jump", "gamepad", []);
	 * core.getBindingOrigin(handle, "jump", "gamepad"); // → "override"
	 * core.getBindingOrigin(handle, "jump", "keyboard"); // → "default"
	 * core.getBindingOrigin(handle, "jump", "keyboard", "vehicle");
	 * // → "undeclared", if "vehicle" does not bind "jump"
	 */
	getBindingOrigin(
		handle: InputHandle,
		action: AllActions<Actions>,
		platform: InputPlatform,
		context?: Contexts,
	): BindingOrigin;

	/**
	 * Returns the effective bindings for a single action.
	 *
	 * Merges default bindings from context configs with any active overrides.
	 * If a context is specified, returns only bindings from that context. When
	 * no context is given, returns bindings from all active contexts (deduped).
	 *
	 * @param handle - The input consumer handle.
	 * @param action - The action name to query.
	 * @param context - Optional context to scope the query.
	 * @returns The effective bindings for the action.
	 */
	getBindings(
		handle: InputHandle,
		action: AllActions<Actions>,
		context?: Contexts,
	): ReadonlyArray<BindingLike>;

	/**
	 * Returns the effective bindings for a single action on one platform.
	 *
	 * Reads that platform's override bucket when it has one, and the declared
	 * bindings classifying to it otherwise. Not the same as `getBindings`
	 * filtered by `filterBindingsByPlatform`: a bucket holds whatever the
	 * player put in it, so a gamepad key deliberately bound on the keyboard
	 * row is returned for `"keyboard"`.
	 * @param handle - The input consumer handle.
	 * @param action - The action name to query.
	 * @param platform - The platform to read.
	 * @param context - Optional context to scope the query.
	 * @returns That platform's effective bindings.
	 * @throws If the context name is unknown.
	 */
	getBindingsForPlatform(
		handle: InputHandle,
		action: AllActions<Actions>,
		platform: InputPlatform,
		context?: Contexts,
	): ReadonlyArray<BindingLike>;

	/**
	 * Returns info about a context for the given handle.
	 *
	 * Combines static context config (priority, sink, declared actions) with
	 * the per-handle active state. `priority` and `sink` fall back to engine
	 * defaults when not specified in the context config. `actions` is the set
	 * of actions declared in the context's bindings — stable across rebinds.
	 *
	 * @param handle - The input consumer handle.
	 * @param context - The context name to query.
	 * @returns Context info record with `active`, `priority`, `sink`, and `actions`.
	 * @throws If the context name is unknown.
	 * @throws If the handle is not registered.
	 * @example
	 * ```ts
	 * const info = core.getContextInfo(handle, "menu");
	 * if (info.active) print(`menu priority: ${info.priority}`);
	 * ```
	 */
	getContextInfo(
		handle: InputHandle,
		context: Contexts,
	): {
		readonly actions: ReadonlyArray<AllActions<Actions>>;
		readonly active: boolean;
		readonly priority: number;
		readonly sink: boolean;
	};

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
	 * Replaces one platform's bindings for a single action, leaving every
	 * other platform structurally untouched.
	 *
	 * A platform this call does not name keeps whatever it had: its own
	 * override if the player set one, or the code-defined default if not — so
	 * a player who only ever rebinds their gamepad still receives updated
	 * keyboard defaults in a later patch. Passing an empty array is a
	 * deliberate unbind of that platform, which is distinct from never having
	 * touched it.
	 *
	 * Touch is not accepted. A touch binding can hold a live `GuiButton`
	 * reference that cannot serialize, so a touch bucket would not round-trip
	 * through a save; touch bindings are preserved by this call but are not
	 * writable through it.
	 * @template A - The action name.
	 * @param handle - The input consumer handle.
	 * @param action - The action to rebind.
	 * @param platform - The platform whose bindings to replace.
	 * @param bindings - The new bindings for that platform.
	 * @throws If called on a subscribed handle.
	 * @example
	 * core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonY]);
	 * // keyboard bindings for "jump" are unchanged and still track defaults
	 */
	rebindForPlatform<A extends AllActions<Actions>>(
		handle: InputHandle,
		action: A,
		platform: RebindPlatform,
		bindings: ReadonlyArray<BindingForAction<Actions[A]["type"]>>,
	): void;

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
	 * @throws If handle is already registered.
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
	 * Resets one platform's bindings for every action to that platform's
	 * defaults, preserving the other platforms' overrides.
	 * @param handle - The input consumer handle.
	 * @param platform - The platform to restore to its defaults.
	 * @throws If called on a subscribed handle.
	 * @example
	 * core.resetAllBindingsForPlatform(handle, "gamepad");
	 * // every keyboard rebind survives untouched
	 */
	resetAllBindingsForPlatform(handle: InputHandle, platform: RebindPlatform): void;

	/**
	 * Resets bindings for a single action to its default.
	 * @param handle - The input consumer handle.
	 * @param action - The action whose bindings to reset.
	 */
	resetBindings(handle: InputHandle, action: AllActions<Actions>): void;

	/**
	 * Resets one platform's bindings for a single action to that platform's
	 * defaults, preserving the other platforms' overrides.
	 * @param handle - The input consumer handle.
	 * @param action - The action whose bindings to reset.
	 * @param platform - The platform to restore to its defaults.
	 * @throws If called on a subscribed handle.
	 * @example
	 * core.resetBindingsForPlatform(handle, "jump", "gamepad");
	 * // a keyboard rebind of "jump" survives untouched
	 */
	resetBindingsForPlatform(
		handle: InputHandle,
		action: AllActions<Actions>,
		platform: RebindPlatform,
	): void;

	/**
	 * Serializes the handle's active binding overrides for persistence.
	 *
	 * The result is sparse at both levels. Only actions with an explicit
	 * override appear, and within an action only the platforms the player
	 * touched appear. Absent entries are restored from the current code's
	 * default context bindings on `loadBindings`, which lets multi-context
	 * actions keep their per-context defaults across a save/load cycle and
	 * lets an untouched platform keep inheriting changes to its defaults. A
	 * platform present with an empty array is a deliberate unbind and loads
	 * back as unbound. Suitable for DataStore persistence of user
	 * customizations.
	 * @param handle - The input consumer handle.
	 * @returns A sparse record of per-platform overrides keyed by action name.
	 * @throws If called on a subscribed handle.
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
	 * Subscribes to server-created IAS instances using an externally-provided
	 * handle.
	 *
	 * @param handle - The externally-provided handle to register under.
	 * @param parent - The instance containing server-created InputContexts.
	 * @param context - First context name to subscribe to (at least one required).
	 * @param contexts - Additional context names to subscribe to.
	 * @returns A cancel function that disconnects ChildAdded listeners.
	 * @throws If handle is already registered.
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
