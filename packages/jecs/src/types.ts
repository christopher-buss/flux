import type {
	ActionMap,
	ActionState,
	ActionValue,
	AllActions,
	BindingForAction,
	BindingLike,
	BindingOrigin,
	BindingState,
	ContextConfig,
	CreateCoreOptions,
	FluxCore,
	InputPlatform,
	RebindPlatform,
} from "@rbxts/flux";
import type { Entity, Tag } from "@rbxts/jecs";

/**
 * Options for creating a FluxJecs instance.
 * @template T - Action map type.
 * @template C - Context configuration record type.
 */
export interface FluxJecsOptions<
	T extends ActionMap,
	C extends Record<string, ContextConfig>,
> extends CreateCoreOptions<T, C> {
	/**
	 * User-provided jecs component for ActionState, created automatically if
	 * omitted.
	 */
	readonly actionStateComponent?: Entity<ActionState<T>>;
}

/**
 * Jecs wrapper around FluxCore.
 *
 * Uses jecs entity IDs as external Flux handles via registerAs/subscribeAs.
 * Exposes ActionState as a jecs component and contexts as jecs tags so ECS
 * systems can query input state.
 *
 * @template T - Action map type.
 * @template C - Context configuration record type.
 */
export interface FluxJecs<
	T extends ActionMap = ActionMap,
	C extends Record<string, ContextConfig> = Record<string, ContextConfig>,
> {
	/** Jecs component entity for ActionState data. */
	readonly ActionState: Entity<ActionState<T>>;

	/**
	 * Activates a context for the given entity.
	 *
	 * Delegates to core and adds the corresponding jecs tag.
	 *
	 * @param entity - The entity to add the context to.
	 * @param context - The context name to activate.
	 * @returns A cancel function that disconnects any ChildAdded listeners
	 * (no-op for owned handles).
	 */
	addContext(entity: Entity, context: keyof C & string): () => void;

	/** Record of jecs tag entities, one per context name. */
	readonly contexts: Readonly<Record<keyof C & string, Tag>>;

	/**
	 * Underlying FluxCore instance (escape hatch).
	 *
	 * @remarks
	 * Core is ECS-agnostic and operates on opaque InputHandles. Mutations
	 * performed directly via core bypass jecs synchronization — ActionState
	 * components and context tags will not be updated. Prefer FluxJecs
	 * methods unless intentionally bypassing synchronization.
	 */
	readonly core: FluxCore<T, keyof C & string>;

	/**
	 * Tears down the FluxJecs instance and releases all resources.
	 */
	destroy(): void;

	/**
	 * Returns the effective bindings for all actions on the given entity.
	 *
	 * @param entity - The entity to query.
	 * @param context - Optional context to scope the query.
	 * @returns A record mapping every action name to its effective bindings.
	 * @see FluxCore.getAllBindings
	 */
	getAllBindings(
		entity: Entity,
		context?: keyof C & string,
	): Record<AllActions<T>, ReadonlyArray<BindingLike>>;

	/**
	 * Reports where one platform's bindings for an action come from.
	 *
	 * @param entity - The entity to query.
	 * @param action - The action name to query.
	 * @param platform - The platform whose row is being rendered.
	 * @param context - Optional context to scope the query.
	 * @returns `"undeclared"`, `"override"`, or `"default"`.
	 * @see FluxCore.getBindingOrigin
	 */
	getBindingOrigin(
		entity: Entity,
		action: AllActions<T>,
		platform: InputPlatform,
		context?: keyof C & string,
	): BindingOrigin;

	/**
	 * Returns the effective bindings for a single action on the given entity.
	 *
	 * @param entity - The entity to query.
	 * @param action - The action name to query.
	 * @param context - Optional context to scope the query.
	 * @returns The effective bindings for the action.
	 * @see FluxCore.getBindings
	 */
	getBindings(
		entity: Entity,
		action: AllActions<T>,
		context?: keyof C & string,
	): ReadonlyArray<BindingLike>;

	/**
	 * Returns the effective bindings for a single action on one platform.
	 *
	 * @param entity - The entity to query.
	 * @param action - The action name to query.
	 * @param platform - The platform to read.
	 * @param context - Optional context to scope the query.
	 * @returns That platform's effective bindings.
	 * @see FluxCore.getBindingsForPlatform
	 */
	getBindingsForPlatform(
		entity: Entity,
		action: AllActions<T>,
		platform: InputPlatform,
		context?: keyof C & string,
	): ReadonlyArray<BindingLike>;

	/**
	 * Returns info about a context for the given entity.
	 *
	 * @param entity - The entity to query.
	 * @param context - The context name to query.
	 * @returns Context info record with `active`, `priority`, `sink`, and `actions`.
	 * @see FluxCore.getContextInfo
	 */
	getContextInfo(
		entity: Entity,
		context: keyof C & string,
	): ReturnType<FluxCore<T, keyof C & string>["getContextInfo"]>;

	/**
	 * Returns the active contexts for the given entity.
	 *
	 * @param entity - The entity to query.
	 * @returns Read-only array of active context names.
	 */
	getContexts(entity: Entity): ReadonlyArray<keyof C & string>;

	/**
	 * Returns the value an inert read of the action reports.
	 *
	 * @template A - The action name, narrowing the returned value type.
	 * @param action - The action to resolve.
	 * @returns The action type's neutral value.
	 * @see FluxCore.getNeutralValue
	 */
	getNeutralValue<A extends AllActions<T>>(action: A): ActionValue<T, A>;

	/**
	 * Returns the action state query interface for the given entity.
	 *
	 * @param entity - The entity to query.
	 * @returns The typed action state for querying input.
	 */
	getState(entity: Entity): ActionState<T>;

	/**
	 * Checks whether a context is active for the given entity.
	 *
	 * @param entity - The entity to check.
	 * @param context - The context name to check.
	 * @returns True if the context is active.
	 */
	hasContext(entity: Entity, context: keyof C & string): boolean;

	/**
	 * Loads serialized bindings for the given entity, merging with defaults.
	 *
	 * @param entity - The entity to load bindings into.
	 * @param data - The serialized binding state to load.
	 * @see FluxCore.loadBindings
	 */
	loadBindings(entity: Entity, data: BindingState<T>): void;

	/**
	 * Replaces all bindings for a single action on the given entity.
	 *
	 * @template A - The action name.
	 * @param entity - The entity to rebind.
	 * @param action - The action to rebind.
	 * @param bindings - The new bindings for the action.
	 * @see FluxCore.rebind
	 */
	rebind<A extends AllActions<T>>(
		entity: Entity,
		action: A,
		bindings: ReadonlyArray<BindingForAction<T[A]["type"]>>,
	): void;

	/**
	 * Replaces all bindings for all actions on the given entity.
	 *
	 * @param entity - The entity to rebind.
	 * @param bindings - The complete binding state to apply.
	 * @see FluxCore.rebindAll
	 */
	rebindAll(entity: Entity, bindings: BindingState<T>): void;

	/**
	 * Replaces one platform's bindings for a single action on the given
	 * entity, leaving every other platform untouched.
	 *
	 * @template A - The action name.
	 * @param entity - The entity to rebind.
	 * @param action - The action to rebind.
	 * @param platform - The platform whose bindings to replace.
	 * @param bindings - The new bindings for that platform.
	 * @throws If called on a subscribed entity.
	 * @see FluxCore.rebindForPlatform
	 */
	rebindForPlatform<A extends AllActions<T>>(
		entity: Entity,
		action: A,
		platform: RebindPlatform,
		bindings: ReadonlyArray<BindingForAction<T[A]["type"]>>,
	): void;

	/**
	 * Registers an entity as an input consumer and activates contexts.
	 *
	 * Sets the {@link ActionState} component on the entity and adds
	 * context tags for each active context.
	 *
	 * @param entity - The jecs entity.
	 * @param parent - The Roblox instance to parent InputContexts under.
	 * @param context - First context name (at least one required).
	 * @param contexts - Additional context names.
	 */
	register(
		entity: Entity,
		parent: Instance,
		context: keyof C & string,
		...contexts: ReadonlyArray<keyof C & string>
	): void;

	/**
	 * Deactivates a context for the given entity.
	 *
	 * Delegates to core and removes the corresponding jecs tag.
	 *
	 * @param entity - The entity to remove the context from.
	 * @param context - The context name to deactivate.
	 */
	removeContext(entity: Entity, context: keyof C & string): void;

	/**
	 * Resets all action bindings for the given entity to their defaults.
	 *
	 * @param entity - The entity to reset.
	 * @see FluxCore.resetAllBindings
	 */
	resetAllBindings(entity: Entity): void;

	/**
	 * Resets one platform's bindings for every action on the given entity.
	 *
	 * @param entity - The entity to reset.
	 * @param platform - The platform to restore to its defaults.
	 * @throws If called on a subscribed entity.
	 * @see FluxCore.resetAllBindingsForPlatform
	 */
	resetAllBindingsForPlatform(entity: Entity, platform: RebindPlatform): void;

	/**
	 * Resets bindings for a single action on the given entity to its default.
	 *
	 * @param entity - The entity to reset.
	 * @param action - The action whose bindings to reset.
	 * @see FluxCore.resetBindings
	 */
	resetBindings(entity: Entity, action: AllActions<T>): void;

	/**
	 * Resets one platform's bindings for a single action on the given entity.
	 *
	 * @param entity - The entity to reset.
	 * @param action - The action whose bindings to reset.
	 * @param platform - The platform to restore to its defaults.
	 * @throws If called on a subscribed entity.
	 * @see FluxCore.resetBindingsForPlatform
	 */
	resetBindingsForPlatform(entity: Entity, action: AllActions<T>, platform: RebindPlatform): void;

	/**
	 * Serializes the entity's active binding overrides for persistence.
	 *
	 * @param entity - The entity to serialize.
	 * @returns A sparse record of per-platform overrides keyed by action name.
	 * @throws If called on a subscribed entity.
	 * @see FluxCore.serializeBindings
	 */
	serializeBindings(entity: Entity): BindingState<T>;

	/**
	 * Injects a synthetic action value for testing or replay.
	 *
	 * @template A - The action name.
	 * @param entity - The entity to simulate on.
	 * @param action - The action name.
	 * @param state - The value to inject.
	 */
	simulateAction<A extends keyof T & string>(
		entity: Entity,
		action: A,
		state: ActionValue<T, A>,
	): void;

	/**
	 * Subscribes to server-created IAS instances under the parent.
	 *
	 * @param entity - The jecs entity.
	 * @param parent - The instance containing server-created InputContexts.
	 * @param context - First context name.
	 * @param contexts - Additional context names.
	 * @returns A cancel function that disconnects listeners.
	 */
	subscribe(
		entity: Entity,
		parent: Instance,
		context: keyof C & string,
		...contexts: ReadonlyArray<keyof C & string>
	): () => void;

	/**
	 * Unregisters an entity, cleaning up its handle and jecs components.
	 *
	 * @param entity - The entity to unregister.
	 */
	unregister(entity: Entity): void;

	/**
	 * Advances input processing for all registered entities.
	 *
	 * @param deltaTime - Time elapsed since last frame in seconds.
	 */
	update(deltaTime: number): void;
}
