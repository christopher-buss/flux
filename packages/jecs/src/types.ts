import type { ActionMap, ActionState, ContextConfig, FluxCore } from "@rbxts/flux";
import type { Entity, Tag } from "@rbxts/jecs";

/**
 * Options for creating a FluxJecs instance.
 * @template T - Action map type.
 * @template C - Context configuration record type.
 */
export interface FluxJecsOptions<T extends ActionMap, C extends Record<string, ContextConfig>> {
	readonly actions: T;
	readonly actionStateComponent?: Entity<ActionState<T>>;
	readonly contexts: C;
}

/**
 * Jecs wrapper around FluxCore.
 *
 * Maps jecs entities to core InputHandles. Exposes ActionState as a jecs
 * component and contexts as jecs tags so ECS systems can query input state.
 *
 * @template T - Action map type.
 * @template C - Context configuration record type.
 */
export interface FluxJecs<
	T extends ActionMap = ActionMap,
	C extends Record<string, ContextConfig> = Record<string, ContextConfig>,
> {
	/** Jecs component entity for ActionState data. */
	// eslint-disable-next-line flawless/naming-convention -- Jecs component entities are typically PascalCase
	readonly ActionState: Entity<ActionState<T>>;

	/**
	 * Activates a context for the given entity.
	 * @param entity - The entity to add the context to.
	 * @param context - The context name to activate.
	 */
	addContext(entity: Entity, context: keyof C & string): void;

	/** Record of jecs tag entities, one per context name. */
	readonly contexts: Readonly<Record<keyof C & string, Tag>>;

	/** Underlying FluxCore instance. */
	readonly core: FluxCore<T, keyof C & string>;

	/**
	 * Tears down the FluxJecs instance and releases all resources.
	 */
	destroy(): void;

	/**
	 * Returns the active contexts for the given entity.
	 * @param entity - The entity to query.
	 * @returns Read-only array of active context names.
	 */
	getContexts(entity: Entity): ReadonlyArray<keyof C & string>;

	/**
	 * Returns the action state for the given entity.
	 * @param entity - The entity to query.
	 * @returns The typed action state.
	 */
	getState(entity: Entity): ActionState<T>;

	/**
	 * Checks whether a context is active for the given entity.
	 * @param entity - The entity to check.
	 * @param context - The context name to check.
	 * @returns True if the context is active.
	 */
	hasContext(entity: Entity, context: keyof C & string): boolean;

	/**
	 * Loads serialized bindings for the given entity.
	 * @param entity - The entity to load bindings for.
	 * @param data - The serialized binding data.
	 */
	loadBindings(entity: Entity, data: unknown): void;

	/**
	 * Replaces bindings for a single action on the given entity.
	 * @param entity - The entity to rebind.
	 * @param action - The action name.
	 * @param bindings - The new bindings.
	 */
	rebind(entity: Entity, action: keyof T & string, bindings: ReadonlyArray<unknown>): void;

	/**
	 * Replaces all bindings for the given entity.
	 * @param entity - The entity to rebind.
	 * @param bindings - The complete binding state.
	 */
	rebindAll(entity: Entity, bindings: unknown): void;

	/**
	 * Registers an entity as an input consumer. Creates IAS instances under
	 * the parent and maps the entity to a core InputHandle.
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
	 * @param entity - The entity to remove the context from.
	 * @param context - The context name to deactivate.
	 */
	removeContext(entity: Entity, context: keyof C & string): void;

	/**
	 * Resets all bindings for the given entity to defaults.
	 * @param entity - The entity to reset.
	 */
	resetAllBindings(entity: Entity): void;

	/**
	 * Resets bindings for a single action to defaults.
	 * @param entity - The entity to reset.
	 * @param action - The action name.
	 */
	resetBindings(entity: Entity, action: keyof T & string): void;

	/**
	 * Serializes current bindings for the given entity.
	 * @param entity - The entity to serialize.
	 * @returns The serialized binding state.
	 */
	serializeBindings(entity: Entity): unknown;

	/**
	 * Injects a synthetic action value for testing or replay.
	 * @param entity - The entity to simulate on.
	 * @param action - The action name.
	 * @param state - The value to inject.
	 */
	simulateAction(entity: Entity, action: keyof T & string, state: unknown): void;

	/**
	 * Subscribes to server-created IAS instances under the parent.
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
	 * @param entity - The entity to unregister.
	 */
	unregister(entity: Entity): void;

	/**
	 * Advances input processing for all registered entities.
	 * @param deltaTime - Time elapsed since last frame in seconds.
	 */
	update(deltaTime: number): void;
}
