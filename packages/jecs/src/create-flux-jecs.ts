import type { ActionMap, ActionState, ContextConfig, InputHandle } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import type { Entity, Id, Tag, World } from "@rbxts/jecs";

import type { FluxJecsOptions } from "./types";

interface FluxJecsResult<T extends ActionMap, C extends Record<string, ContextConfig>> {
	// eslint-disable-next-line flawless/naming-convention -- Jecs component convention
	readonly ActionState: Entity<ActionState<T>>;
	readonly contexts: Readonly<Record<keyof C & string, Tag>>;

	getState(entity: Entity): ActionState<T>;

	register(
		entity: Entity,
		parent: Instance,
		context: keyof C & string,
		...rest: ReadonlyArray<keyof C & string>
	): void;

	simulateAction(entity: Entity, action: keyof T & string, state: unknown): void;

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
		contextTags[name as Contexts] = world.component() as unknown as Tag;
	}

	function addContextTags(entity: Entity): void {
		const activeContexts = core.getContexts(toHandle(entity));
		for (const [name] of pairs(contextTags)) {
			const tag = contextTags[name as Contexts] as unknown as Id;
			if (activeContexts.includes(name as Contexts) && !world.has(entity, tag)) {
				world.add(entity, tag as Id<never>);
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

		simulateAction(entity: Entity, action: keyof T & string, state: unknown): void {
			core.simulateAction(toHandle(entity), action, state as never);
		},

		update(deltaTime: number): void {
			core.update(deltaTime);
		},
	};
}

function toHandle(entity: Entity): InputHandle {
	return entity as unknown as InputHandle;
}
