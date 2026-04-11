import { FluxError } from "../errors";
import type { ActionMap } from "../types/actions";
import type { BindingLike, BindingState } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { HandleData } from "./handle-lifecycle";
import type { InputInstanceData } from "./input-instances";
import { createInputBinding } from "./input-instances";

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

	for (const [contextName, inputContext] of data.inputContexts) {
		const inputAction = inputContext.FindFirstChild(actionName);
		if (inputAction === undefined || !classIs(inputAction, "InputAction")) {
			continue;
		}

		const bindings = resolve(contextName);
		for (const bindingLike of bindings) {
			createInputBinding(bindingLike, inputAction, data.instances);
		}
	}
}

/**
 * Throws if the given handle subscribes to server-owned instances. Rebinding
 * mutates `InputBinding` instances, which only the owner may modify.
 * @template T - The action map type.
 * @param handleData - Handle state to guard.
 * @throws FluxError if `handleData.instanceData.owned` is `false`.
 */
export function assertOwnedForRebind<T extends ActionMap>(handleData: HandleData<T>): void {
	if (!handleData.instanceData.owned) {
		throw new FluxError("cannot rebind a subscribed handle");
	}
}

/**
 * Applies a single-action rebind: records the override and rewires Roblox
 * `InputBinding` instances for that action across all relevant contexts.
 * @template T - The action map type.
 * @param handleData - Handle state to mutate.
 * @param action - The action name to rebind.
 * @param bindings - Replacement bindings for this action.
 */
export function applyRebindOne<T extends ActionMap>(
	handleData: HandleData<T>,
	action: string,
	bindings: ReadonlyArray<BindingLike>,
): void {
	handleData.bindingOverrides.set(action, bindings);
	rebuildActionBindings(handleData.instanceData, action, () => bindings);
}

/**
 * Performs a full replace of the override map. Actions present in `bindings`
 * receive their new values; every other action known to the handle is
 * restored to its original context bindings.
 * @template T - The action map type.
 * @param handleData - Handle state to mutate.
 * @param contexts - Core context config used to resolve originals.
 * @param bindings - The full binding state to apply.
 */
export function applyRebindAll<T extends ActionMap>(
	handleData: HandleData<T>,
	contexts: Record<string, ContextConfig>,
	bindings: BindingState<T>,
): void {
	handleData.bindingOverrides.clear();
	const handledActions = new Set<string>();
	const typedBindings = bindings as Record<string, ReadonlyArray<BindingLike>>;
	for (const [action, actionBindings] of pairs(typedBindings)) {
		handleData.bindingOverrides.set(action, actionBindings);
		rebuildActionBindings(handleData.instanceData, action, () => actionBindings);
		handledActions.add(action);
	}

	for (const [actionName] of handleData.instanceData.inputActions) {
		if (handledActions.has(actionName)) {
			continue;
		}

		rebuildActionBindings(handleData.instanceData, actionName, (contextName) => {
			return getContextOriginalBindings(contexts, contextName, actionName);
		});
	}
}

/**
 * Removes the override for a single action and restores its original bindings.
 * @template T - The action map type.
 * @param handleData - Handle state to mutate.
 * @param contexts - Core context config used to resolve originals.
 * @param action - Action whose override to discard.
 */
export function applyResetOne<T extends ActionMap>(
	handleData: HandleData<T>,
	contexts: Record<string, ContextConfig>,
	action: string,
): void {
	handleData.bindingOverrides.delete(action);
	rebuildActionBindings(handleData.instanceData, action, (contextName) => {
		return getContextOriginalBindings(contexts, contextName, action);
	});
}

/**
 * Clears every override on the handle and restores all actions to defaults.
 * @template T - The action map type.
 * @param handleData - Handle state to mutate.
 * @param contexts - Core context config used to resolve originals.
 */
export function applyResetAll<T extends ActionMap>(
	handleData: HandleData<T>,
	contexts: Record<string, ContextConfig>,
): void {
	handleData.bindingOverrides.clear();
	for (const [actionName] of handleData.instanceData.inputActions) {
		rebuildActionBindings(handleData.instanceData, actionName, (contextName) => {
			return getContextOriginalBindings(contexts, contextName, actionName);
		});
	}
}

/**
 * Produces a self-contained binding state including both current overrides
 * and original bindings for unchanged actions.
 * @template T - The action map type.
 * @param handleData - Handle state to read.
 * @param contexts - Core context config used to resolve originals.
 * @returns A record of effective bindings keyed by action name.
 */
export function serializeFullBindings<T extends ActionMap>(
	handleData: HandleData<T>,
	contexts: Record<string, ContextConfig>,
): Record<string, ReadonlyArray<BindingLike>> {
	const result: Record<string, ReadonlyArray<BindingLike>> = {};
	for (const [actionName] of handleData.instanceData.inputActions) {
		const override = handleData.bindingOverrides.get(actionName);
		if (override !== undefined) {
			result[actionName] = override;
			continue;
		}

		for (const [contextName] of handleData.instanceData.inputContexts) {
			const contextConfig = contexts[contextName];
			assert(contextConfig, `missing context config: ${contextName}`);
			const bindings = (
				contextConfig.bindings as Record<string, ReadonlyArray<BindingLike> | undefined>
			)[actionName];
			if (bindings !== undefined) {
				result[actionName] = bindings;
				break;
			}
		}
	}

	return result;
}

function destroyExistingBindings(data: InputInstanceData, actionName: string): Set<Instance> {
	const destroyed = new Set<Instance>();
	for (const [, inputContext] of data.inputContexts) {
		const inputAction = inputContext.FindFirstChild(actionName);
		if (inputAction === undefined || !classIs(inputAction, "InputAction")) {
			continue;
		}

		for (const child of inputAction.GetChildren()) {
			destroyed.add(child);
			child.Destroy();
		}
	}

	return destroyed;
}

function pruneInstances(instances: Array<Instance>, destroyed: Set<Instance>): void {
	for (let index = instances.size() - 1; index >= 0; index -= 1) {
		const instance = instances[index];
		if (instance !== undefined && destroyed.has(instance)) {
			instances.remove(index);
		}
	}
}

/**
 * Reads the original bindings defined in a specific context's config for
 * the given action. Returns an empty array if the action is not bound in
 * that context.
 * @param contexts - The core's context config record.
 * @param contextName - The context to read from.
 * @param action - The action whose original bindings to look up.
 * @returns The declared bindings or an empty array.
 */
function getContextOriginalBindings(
	contexts: Record<string, ContextConfig>,
	contextName: string,
	action: string,
): ReadonlyArray<BindingLike> {
	const contextConfig = contexts[contextName];
	assert(contextConfig, `missing context config: ${contextName}`);
	const bindings = (
		contextConfig.bindings as Record<string, ReadonlyArray<BindingLike> | undefined>
	)[action];
	return bindings ?? [];
}
