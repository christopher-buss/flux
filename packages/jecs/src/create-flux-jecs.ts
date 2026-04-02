import type { ActionMap, ActionState, ActionValue, ContextConfig, InputHandle } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import type { Entity, Tag, World } from "@rbxts/jecs";

import type { FluxJecs, FluxJecsOptions } from "./types";

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
): FluxJecs<T, C> {
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
		addContext(entity: Entity, context: Contexts): () => void {
			const cancel = core.addContext(toHandle(entity), context);
			world.add(entity, contextTags[context]);
			return cancel;
		},

		contexts: table.freeze(contextTags),
		core,

		destroy(): void {
			core.destroy();
		},

		getContexts(entity: Entity): ReadonlyArray<Contexts> {
			return core.getContexts(toHandle(entity));
		},

		getState(entity: Entity): ActionState<T> {
			return core.getState(toHandle(entity));
		},

		hasContext(entity: Entity, context: Contexts): boolean {
			return core.hasContext(toHandle(entity), context);
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

		removeContext(entity: Entity, context: Contexts): void {
			core.removeContext(toHandle(entity), context);
			world.remove(entity, contextTags[context]);
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
