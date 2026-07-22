import type { BindingLike } from "../types/bindings";
import { createInputBinding } from "./input-bindings";
import type { InputInstanceData } from "./input-instances";

/**
 * Destroys every child of an `InputAction`, recording what was destroyed.
 *
 * The record is what lets {@link pruneInstances} drop the same instances from
 * the handle's flat tracking list, which holds them for teardown.
 * @param inputAction - The instance whose bindings to clear.
 * @param destroyed - Set collecting the destroyed children, mutated in place.
 */
export function destroyChildrenInto(inputAction: InputAction, destroyed: Set<Instance>): void {
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
export function pruneInstances(instances: Array<Instance>, destroyed: Set<Instance>): void {
	for (let index = instances.size() - 1; index >= 0; index -= 1) {
		const instance = instances[index];
		if (instance !== undefined && destroyed.has(instance)) {
			instances.remove(index);
		}
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
	const destroyed = destroyExistingBindings(data, actionName);
	pruneInstances(data.instances, destroyed);

	for (const [contextName, actionInstances] of data.actionsByContext) {
		const inputAction = actionInstances.get(actionName);
		if (inputAction === undefined) {
			continue;
		}

		for (const bindingLike of resolve(contextName)) {
			createInputBinding(bindingLike, inputAction, data.instances);
		}
	}
}

function destroyExistingBindings(data: InputInstanceData, actionName: string): Set<Instance> {
	const destroyed = new Set<Instance>();
	for (const [, actionInstances] of data.actionsByContext) {
		const inputAction = actionInstances.get(actionName);
		if (inputAction === undefined) {
			continue;
		}

		destroyChildrenInto(inputAction, destroyed);
	}

	return destroyed;
}
