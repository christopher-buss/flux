import type { BindingLike } from "../types/bindings";
import { createInputBinding } from "./input-bindings";
import type { InputInstanceData } from "./input-instances";

/**
 * Arguments for replacing one context's bindings for one action.
 */
export interface RebuildContextActionOptions {
	/** The action whose bindings to rebuild. */
	readonly actionName: string;
	/** The replacement bindings for that context. */
	readonly bindings: ReadonlyArray<BindingLike>;
	/** The context whose bindings to rebuild. */
	readonly contextName: string;
	/** The handle's input instance data. */
	readonly data: InputInstanceData;
}

/**
 * Arguments for rebuilding one action across every registered context.
 */
export interface RebuildActionOptions {
	/** The action whose bindings to rebuild. */
	readonly actionName: string;
	/** The handle's input instance data. */
	readonly data: InputInstanceData;
	/** Per-context resolver returning replacement bindings. */
	readonly resolve: (contextName: string) => ReadonlyArray<BindingLike>;
}

/**
 * Arguments for writing one `InputAction`'s binding children.
 */
interface ActionBindingsOptions {
	/** The replacement bindings. */
	readonly bindings: ReadonlyArray<BindingLike>;
	/** The handle's input instance data. */
	readonly data: InputInstanceData;
	/** The instance whose bindings to replace. */
	readonly inputAction: InputAction;
}

/**
 * Replaces one context's `InputBinding` children for one action.
 *
 * The single-context entry point, used by a replay into a freshly-activated
 * context so that activating a context does not destroy and recreate the
 * instances of every context already live.
 * @param options - The handle's instance data, the context and action to
 * rebuild, and the replacement bindings for that context.
 * @throws If the context is not registered for the handle.
 */
export function rebuildContextAction({
	actionName,
	bindings,
	contextName,
	data,
}: RebuildContextActionOptions): void {
	const actionInstances = data.actionsByContext.get(contextName);
	assert(actionInstances, `context not registered: ${contextName}`);
	const inputAction = actionInstances.get(actionName);
	if (inputAction === undefined) {
		return;
	}

	replaceActionBindings({ bindings, data, inputAction });
}

/**
 * Replaces every `InputBinding` child on all `InputAction` instances that
 * match the given action name across the handle's registered contexts. The
 * resolver picks the replacement bindings per context, so callers can share
 * one set across contexts (for rebind) or restore per-context originals
 * (for reset).
 *
 * Every context is destroyed first and the flat tracking list is pruned once,
 * rather than once per context: {@link pruneInstances} scans the whole list,
 * which holds every instance the handle owns, so pruning per context would
 * cost contexts × instances for what one pass does.
 * @param options - The handle's instance data, the action to rebuild and a
 * per-context resolver returning replacement bindings.
 */
export function rebuildActionBindings({ actionName, data, resolve }: RebuildActionOptions): void {
	const destroyed = new Set<Instance>();
	const cleared = new Array<[string, InputAction]>();
	for (const [contextName, actionInstances] of data.actionsByContext) {
		const inputAction = actionInstances.get(actionName);
		if (inputAction === undefined) {
			continue;
		}

		destroyChildrenInto(inputAction, destroyed);
		cleared.push([contextName, inputAction]);
	}

	pruneInstances(data.instances, destroyed);
	for (const [contextName, inputAction] of cleared) {
		createBindingsInto({ bindings: resolve(contextName), data, inputAction });
	}
}

/**
 * Creates an `InputBinding` child per replacement binding, tracking each on the
 * handle's flat instance list.
 * @param options - The handle's instance data, the instance to parent the
 * bindings to and the bindings to create.
 */
function createBindingsInto({ bindings, data, inputAction }: ActionBindingsOptions): void {
	for (const bindingLike of bindings) {
		createInputBinding(bindingLike, inputAction, data.instances);
	}
}

/**
 * Destroys every child of an `InputAction`, recording what was destroyed.
 *
 * The record is what lets {@link pruneInstances} drop the same instances from
 * the handle's flat tracking list, which holds them for teardown.
 * @param inputAction - The instance whose bindings to clear.
 * @param destroyed - Set collecting the destroyed children, mutated in place.
 */
function destroyChildrenInto(inputAction: InputAction, destroyed: Set<Instance>): void {
	for (const child of inputAction.GetChildren()) {
		destroyed.add(child);
		child.Destroy();
	}
}

/**
 * Drops every destroyed instance from the handle's flat tracking list.
 *
 * Iterates backwards so a removal does not shift an index yet to be visited.
 * @param instances - The handle's tracked instances, mutated in place.
 * @param destroyed - The instances already destroyed.
 */
function pruneInstances(instances: Array<Instance>, destroyed: Set<Instance>): void {
	for (let index = instances.size() - 1; index >= 0; index -= 1) {
		const instance = instances[index];
		if (instance !== undefined && destroyed.has(instance)) {
			instances.remove(index);
		}
	}
}

/**
 * Swaps one `InputAction`'s `InputBinding` children for a new set, keeping the
 * handle's flat tracking list in step.
 *
 * The single-context form: {@link rebuildActionBindings} runs the same three
 * steps batched across contexts so it prunes once.
 *
 * The destroy is unfiltered by design. A rebuild recomposes the action's full
 * binding list from its platform buckets plus the defaults for the platforms
 * with no bucket, so there is no platform predicate to get wrong — see
 * `docs/adr/0004-per-platform-binding-overrides.md`.
 * @param options - The handle's instance data, the instance whose bindings to
 * replace and the replacement bindings.
 */
function replaceActionBindings({ bindings, data, inputAction }: ActionBindingsOptions): void {
	const destroyed = new Set<Instance>();
	destroyChildrenInto(inputAction, destroyed);
	pruneInstances(data.instances, destroyed);
	createBindingsInto({ bindings, data, inputAction });
}
