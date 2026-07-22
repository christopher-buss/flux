import type { BindingLike } from "../types/bindings";
import { createInputBinding } from "./input-bindings";
import type { InputInstanceData } from "./input-instances";

/**
 * Replaces one context's `InputBinding` children for one action.
 *
 * The one-context primitive both rebuild paths are defined in terms of:
 * {@link rebuildActionBindings} loops it across every registered context, and
 * a replay into a freshly-activated context calls it once, so activating a
 * context does not destroy and recreate the instances of every context already
 * live.
 *
 * The destroy is unfiltered by design. A rebuild recomposes the action's full
 * binding list from its platform buckets plus the defaults for the platforms
 * with no bucket, so there is no platform predicate to get wrong — see
 * `docs/adr/0004-per-platform-binding-overrides.md`.
 * @param data - The handle's input instance data.
 * @param contextName - The context whose bindings to rebuild.
 * @param actionName - The action whose bindings to rebuild.
 * @param bindings - The replacement bindings for that context.
 * @throws If the context is not registered for the handle.
 */
export function rebuildContextAction(
	data: InputInstanceData,
	contextName: string,
	actionName: string,
	bindings: ReadonlyArray<BindingLike>,
): void {
	const actionInstances = data.actionsByContext.get(contextName);
	assert(actionInstances, `context not registered: ${contextName}`);
	const inputAction = actionInstances.get(actionName);
	if (inputAction === undefined) {
		return;
	}

	const destroyed = new Set<Instance>();
	destroyChildrenInto(inputAction, destroyed);
	pruneInstances(data.instances, destroyed);
	for (const bindingLike of bindings) {
		createInputBinding(bindingLike, inputAction, data.instances);
	}
}

/**
 * Replaces every `InputBinding` child on all `InputAction` instances that
 * match the given action name across the handle's registered contexts. The
 * resolver picks the replacement bindings per context, so callers can share
 * one set across contexts (for rebind) or restore per-context originals
 * (for reset).
 * @param data - The handle's input instance data.
 * @param actionName - The action whose bindings to rebuild.
 * @param resolve - Per-context resolver returning replacement bindings.
 */
export function rebuildActionBindings(
	data: InputInstanceData,
	actionName: string,
	resolve: (contextName: string) => ReadonlyArray<BindingLike>,
): void {
	for (const [contextName, actionInstances] of data.actionsByContext) {
		if (actionInstances.get(actionName) === undefined) {
			continue;
		}

		rebuildContextAction(data, contextName, actionName, resolve(contextName));
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
