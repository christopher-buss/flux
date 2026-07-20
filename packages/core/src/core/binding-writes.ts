import type { ActionMap } from "../types/actions";
import type { BindingLike, BindingState, RebindPlatform } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { InputHandle } from "../types/core";
import type { HandleData } from "./handle-lifecycle";
import { getHandleData } from "./handle-lifecycle";
import {
	applyRebindAll,
	applyRebindForPlatform,
	applyRebindOne,
	applyResetAll,
	applyResetForPlatform,
	applyResetOne,
	assertOwnedForRebind,
} from "./rebinding";

/**
 * What every binding write needs from the core it was called on.
 *
 * The write side of the binding API shares one prologue — find the handle's
 * state, then refuse a subscribed handle, which owns no `InputBinding`
 * instances to mutate — which lives here rather than being restated by each
 * `FluxCore` method.
 * @template T - The action map type.
 */
export interface CoreWriteOptions<T extends ActionMap> {
	/** Core context config record. */
	readonly contexts: Record<string, ContextConfig>;
	/** The handle to write for. */
	readonly handle: InputHandle;
	/** Every registered handle's state. */
	readonly handles: Map<InputHandle, HandleData<T>>;
}

/**
 * A write scoped to one action.
 * @template T - The action map type.
 */
export interface CoreActionWriteOptions<T extends ActionMap> extends CoreWriteOptions<T> {
	/** The action to write. */
	readonly action: string;
}

/**
 * A whole-action rebind.
 * @template T - The action map type.
 */
export interface CoreRebindOptions<T extends ActionMap> extends CoreActionWriteOptions<T> {
	/** Replacement bindings for the action. */
	readonly bindings: ReadonlyArray<BindingLike>;
}

/**
 * A rebind or reset scoped to one platform.
 * @template T - The action map type.
 */
export interface CorePlatformWriteOptions<T extends ActionMap> extends CoreActionWriteOptions<T> {
	/** The platform whose bucket the write targets. */
	readonly platform: RebindPlatform;
}

/**
 * A rebind scoped to one platform.
 * @template T - The action map type.
 */
export interface CorePlatformRebindOptions<
	T extends ActionMap,
> extends CorePlatformWriteOptions<T> {
	/** Replacement bindings for that platform. */
	readonly bindings: ReadonlyArray<BindingLike>;
}

/**
 * A full replace of every action's overrides.
 * @template T - The action map type.
 */
export interface CoreRebindAllOptions<T extends ActionMap> extends CoreWriteOptions<T> {
	/** The core's full action map, used to drop unknown keys. */
	readonly actions: T;
	/** The complete binding state to apply. */
	readonly bindings: BindingState<T>;
}

/**
 * Replaces every action's bindings from a whole binding state.
 * @template T - The action map type.
 * @param options - The action map, binding state, handle and context config.
 * @throws If the handle is not registered or does not own its instances.
 */
export function writeAllBindings<T extends ActionMap>(options: CoreRebindAllOptions<T>): void {
	const { actions, bindings, contexts } = options;
	applyRebindAll({ actions, bindings, contexts, handleData: ownedHandleData(options) });
}

/**
 * Replaces one action's bindings across every platform.
 * @template T - The action map type.
 * @param options - The action, replacement bindings, handle and context config.
 * @throws If the handle is not registered or does not own its instances.
 */
export function writeBindings<T extends ActionMap>(options: CoreRebindOptions<T>): void {
	const { action, bindings, contexts } = options;
	applyRebindOne({ action, bindings, contexts, handleData: ownedHandleData(options) });
}

/**
 * Replaces one platform's bindings for one action.
 * @template T - The action map type.
 * @param options - The action, platform, replacement bindings, handle and
 * context config.
 * @throws If the handle is not registered or does not own its instances.
 */
export function writeBindingsForPlatform<T extends ActionMap>(
	options: CorePlatformRebindOptions<T>,
): void {
	const { action, bindings, contexts, platform } = options;
	applyRebindForPlatform({
		action,
		bindings,
		contexts,
		handleData: ownedHandleData(options),
		platform,
	});
}

/**
 * Restores every action on the handle to its code-defined bindings.
 * @template T - The action map type.
 * @param options - The handle and context config.
 * @throws If the handle is not registered or does not own its instances.
 */
export function clearAllBindings<T extends ActionMap>(options: CoreWriteOptions<T>): void {
	applyResetAll(ownedHandleData(options), options.contexts);
}

/**
 * Restores one action to its code-defined bindings on every platform.
 * @template T - The action map type.
 * @param options - The action, handle and context config.
 * @throws If the handle is not registered or does not own its instances.
 */
export function clearBindings<T extends ActionMap>(options: CoreActionWriteOptions<T>): void {
	const { action, contexts } = options;
	applyResetOne({ action, contexts, handleData: ownedHandleData(options) });
}

/**
 * Restores one platform's bindings for one action, leaving the other
 * platforms' overrides in place.
 * @template T - The action map type.
 * @param options - The action, platform, handle and context config.
 * @throws If the handle is not registered or does not own its instances.
 */
export function clearBindingsForPlatform<T extends ActionMap>(
	options: CorePlatformWriteOptions<T>,
): void {
	const { action, contexts, platform } = options;
	applyResetForPlatform({ action, contexts, handleData: ownedHandleData(options), platform });
}

/**
 * Finds the handle's state and refuses one that does not own its instances.
 * @template T - The action map type.
 * @param options - The handle and the registry to find it in.
 * @returns The handle's state.
 * @throws If the handle is not registered or does not own its instances.
 */
function ownedHandleData<T extends ActionMap>(options: CoreWriteOptions<T>): HandleData<T> {
	const handleData = getHandleData(options.handles, options.handle);
	assertOwnedForRebind(handleData);
	return handleData;
}
