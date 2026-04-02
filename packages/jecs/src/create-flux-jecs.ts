import type { ActionMap, ActionState, ActionValue, ContextConfig, InputHandle } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import type { Entity, Tag, World } from "@rbxts/jecs";

import type { FluxJecsOptions } from "./types";

/**
 * Result of {@link createFluxJecs}, providing jecs-integrated input handling.
 *
 * @template T - Action map type.
 * @template C - Context configuration record type.
 */
export interface FluxJecsResult<T extends ActionMap, C extends Record<string, ContextConfig>> {
	/** Jecs component for storing action state on entities. */
	// eslint-disable-next-line flawless/naming-convention -- Jecs component convention
	readonly ActionState: Entity<ActionState<T>>;
	/** Jecs tags for each context, queryable via `world.has(entity, tag)`. */
	readonly contexts: Readonly<Record<keyof C & string, Tag>>;

	/**
	 * Returns the action state query interface for the given entity.
	 *
	 * @param entity - The entity to query.
	 * @returns The typed action state for querying input.
	 */
	getState(entity: Entity): ActionState<T>;

	/**
	 * Registers an entity as an input consumer and activates contexts.
	 *
	 * Sets the {@link ActionState} component on the entity and adds
	 * context tags for each active context.
	 *
	 * @param entity - The entity to register.
	 * @param parent - The instance to parent InputContexts under.
	 * @param context - First context to activate (at least one required).
	 * @param rest - Additional contexts to activate.
	 */
	register(
		entity: Entity,
		parent: Instance,
		context: keyof C & string,
		...rest: ReadonlyArray<keyof C & string>
	): void;

	/**
	 * Injects a synthetic action value for testing or replay.
	 *
	 * @template A - The action name.
	 * @param entity - The entity to simulate input for.
	 * @param action - The action to simulate.
	 * @param state - The value to inject, matching the action's type.
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
	 * @param context - First context to subscribe to (at least one required).
	 * @param rest - Additional contexts to subscribe to.
	 * @returns A cancel function that disconnects all tracked subscription connections.
	 */
	subscribe(
		entity: Entity,
		parent: Instance,
		context: keyof C & string,
		...rest: ReadonlyArray<keyof C & string>
	): () => void;

	/**
	 * Unregisters an entity, removing its ActionState component and context tags.
	 *
	 * @param entity - The entity to unregister.
	 */
	unregister(entity: Entity): void;

	/**
	 * Advances the input system by one frame.
	 *
	 * @param deltaTime - Time elapsed since last frame in seconds.
	 */
	update(deltaTime: number): void;
}

/**
 * Creates a FluxJecs instance that wraps FluxCore with jecs integration.
 *
 * Uses jecs entities directly as core InputHandles, eliminating the need
 * for a separate entity-to-handle mapping.
 *
 * @template T - Action map type.
 * @template C - Context configuration record type.
 * @param world - The jecs world to use.
 * @param options - Actions, contexts, and optional user-provided component.
 * @returns A FluxJecs instance.
 */
// eslint-disable-next-line max-lines-per-function -- factory with thin delegation
export function createFluxJecs<T extends ActionMap, C extends Record<string, ContextConfig>>(
	world: World,
	options: FluxJecsOptions<T, C>,
): FluxJecsResult<T, C> {
	type Contexts = keyof C & string;

	const { actions, contexts } = options;
	const core = createCore({ actions, contexts });

	const actionStateComponent = options.actionStateComponent ?? world.component<ActionState<T>>();

	const contextTags = {} as Record<Contexts, Tag>;
	for (const [name] of pairs(contexts)) {
		contextTags[name as Contexts] = world.component();
	}

	function addContextTags(entity: Entity): void {
		const activeContexts = core.getContexts(toHandle(entity));
		for (const [name] of pairs(contextTags)) {
			const tag = contextTags[name as Contexts];
			if (activeContexts.includes(name as Contexts) && !world.has(entity, tag)) {
				world.add(entity, tag);
			}
		}
	}

	return {
		ActionState: actionStateComponent,
		contexts: table.freeze(contextTags),

		getState(entity: Entity): ActionState<T> {
			return core.getState(toHandle(entity));
		},

		register(
			entity: Entity,
			parent: Instance,
			context: Contexts,
			...rest: ReadonlyArray<Contexts>
		): void {
			core.registerAs(toHandle(entity), parent, context, ...rest);

			const state = core.getState(toHandle(entity));
			world.set(entity, actionStateComponent, state);
			addContextTags(entity);
		},

		simulateAction<A extends keyof T & string>(
			entity: Entity,
			action: A,
			state: ActionValue<T, A>,
		): void {
			core.simulateAction(toHandle(entity), action, state);
		},

		subscribe(
			entity: Entity,
			parent: Instance,
			context: Contexts,
			...rest: ReadonlyArray<Contexts>
		): () => void {
			const cancel = core.subscribeAs(toHandle(entity), parent, context, ...rest);

			const state = core.getState(toHandle(entity));
			world.set(entity, actionStateComponent, state);
			addContextTags(entity);

			return cancel;
		},

		unregister(entity: Entity): void {
			core.unregister(toHandle(entity));
			world.remove(entity, actionStateComponent);
			for (const [name] of pairs(contextTags)) {
				const tag = contextTags[name as Contexts];
				if (world.has(entity, tag)) {
					world.remove(entity, tag);
				}
			}
		},

		update(deltaTime: number): void {
			core.update(deltaTime);
		},
	};
}

function toHandle(entity: Entity): InputHandle {
	return entity as unknown as InputHandle;
}
