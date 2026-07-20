import type { Writable } from "type-fest";

import type { ActionMap } from "../types/actions";
import type {
	BindingLike,
	BindingState,
	PlatformBindings,
	RebindPlatform,
} from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { HandleData } from "./handle-lifecycle";
import { createBindingsForAction, createInputBinding } from "./input-bindings";
import type { InputInstanceData } from "./input-instances";
import type { PlatformOverrides } from "./platform-overrides";
import { bucketByPlatform, composeBindings, PLATFORM_ORDER } from "./platform-overrides";
import { getContextBindings } from "./resolve-bindings";

/**
 * A binding state read action-by-action rather than through the action names
 * its type parameter declares.
 *
 * Every {@link BindingState} satisfies this structurally, which lets the load
 * path iterate a payload whose keys are only known at runtime — a save can
 * name an action this build no longer has — without asserting its type.
 */
type SerializedBindings = Readonly<Record<string, PlatformBindings | undefined>>;

/**
 * An action map read name-by-name, for checking whether a loaded key is still
 * a declared action.
 */
type DeclaredActions = Readonly<Record<string, unknown>>;

/**
 * The handle, contexts and action every rebind and reset operates on.
 * @template T - The action map type.
 */
interface ActionScopedOptions<T extends ActionMap> {
	/** The action the operation targets. */
	readonly action: string;
	/** Core context config used to resolve defaults. */
	readonly contexts: Record<string, ContextConfig>;
	/** Handle state to mutate. */
	readonly handleData: HandleData<T>;
}

/**
 * Arguments for a whole-action rebind.
 * @template T - The action map type.
 */
interface ActionRebindOptions<T extends ActionMap> extends ActionScopedOptions<T> {
	/** Replacement bindings for the action, across every platform. */
	readonly bindings: ReadonlyArray<BindingLike>;
}

/**
 * Arguments for a rebind or reset scoped to a single platform.
 * @template T - The action map type.
 */
interface PlatformScopedOptions<T extends ActionMap> extends ActionScopedOptions<T> {
	/** The platform whose bucket the operation targets. */
	readonly platform: RebindPlatform;
}

/**
 * Arguments for a rebind scoped to a single platform.
 * @template T - The action map type.
 */
interface PlatformRebindOptions<T extends ActionMap> extends PlatformScopedOptions<T> {
	/** Replacement bindings for that platform. */
	readonly bindings: ReadonlyArray<BindingLike>;
}

/**
 * Arguments for a full replace of the override map.
 * @template T - The action map type.
 */
interface RebindAllOptions<T extends ActionMap> {
	/** Core action map used to filter unknown keys. */
	readonly actions: DeclaredActions;
	/** The full binding state to apply. */
	readonly bindings: SerializedBindings;
	/** Core context config used to resolve originals. */
	readonly contexts: Record<string, ContextConfig>;
	/** Handle state to mutate. */
	readonly handleData: HandleData<T>;
}

/**
 * Arguments for replaying overrides into one freshly-activated context.
 * @template T - The action map type.
 */
interface ReplayOptions<T extends ActionMap> {
	/** Name of the context that was just activated. */
	readonly contextName: string;
	/** Core context config used to resolve defaults. */
	readonly contexts: Record<string, ContextConfig>;
	/** Handle state containing the active overrides. */
	readonly handleData: HandleData<T>;
}

/**
 * Arguments for restoring actions to their per-context original bindings.
 * @template T - The action map type.
 */
interface RestoreOptions<T extends ActionMap> {
	/** Core context config used to resolve originals. */
	readonly contexts: Record<string, ContextConfig>;
	/** Handle state to rebuild from. */
	readonly handleData: HandleData<T>;
	/** Actions to leave untouched, typically those just overridden. */
	readonly skip?: ReadonlySet<string>;
}

/**
 * Arguments for reading a context's declared bindings for an action.
 */
interface ContextDefaultsOptions {
	/** The action whose declared bindings to read. */
	readonly action: string;
	/** The context to read from. */
	readonly contextName: string;
	/** Core context config record. */
	readonly contexts: Record<string, ContextConfig>;
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

/**
 * Throws if the given handle subscribes to server-owned instances. Rebinding
 * mutates `InputBinding` instances, which only the owner may modify.
 * @template T - The action map type.
 * @param handleData - Handle state to guard.
 * @throws If `handleData.instanceData.owned` is `false`.
 */
export function assertOwnedForRebind<T extends ActionMap>(handleData: HandleData<T>): void {
	assert(handleData.instanceData.owned, "cannot rebind a subscribed handle");
}

/**
 * Applies a single-action rebind: records the override and rewires Roblox
 * `InputBinding` instances for that action across all relevant contexts.
 *
 * The replacement list is classified into per-platform buckets and every
 * platform is written, including those the list has no bindings for — a
 * whole-action rebind replaces the action outright, so a platform the caller
 * omitted becomes unbound rather than falling back to its default.
 * @template T - The action map type.
 * @param options - The action, handle state and context config, plus the
 * replacement bindings for the action.
 */
export function applyRebindOne<T extends ActionMap>(options: ActionRebindOptions<T>): void {
	const { action, bindings, contexts, handleData } = options;
	const byPlatform = bucketByPlatform(bindings);
	const overrides: PlatformOverrides = new Map();
	for (const platform of PLATFORM_ORDER) {
		overrides.set(platform, byPlatform.get(platform) ?? []);
	}

	handleData.bindingOverrides.set(action, overrides);
	rebuildFromOverrides({ action, contexts, handleData });
}

/**
 * Applies a rebind scoped to one platform: writes exactly that platform's
 * bucket and leaves every other platform structurally untouched, so a
 * platform the player has never customized keeps tracking its code-defined
 * default.
 * @template T - The action map type.
 * @param options - The action, platform, handle state and context config, plus
 * the replacement bindings. An empty array is a deliberate unbind.
 */
export function applyRebindForPlatform<T extends ActionMap>(
	options: PlatformRebindOptions<T>,
): void {
	const { action, bindings, contexts, handleData, platform } = options;
	let overrides = handleData.bindingOverrides.get(action);
	if (overrides === undefined) {
		overrides = new Map();
		handleData.bindingOverrides.set(action, overrides);
	}

	overrides.set(platform, [...bindings]);
	rebuildFromOverrides({ action, contexts, handleData });
}

/**
 * Performs a full replace of the override map. Actions present in `bindings`
 * receive their new values; every other action known to the handle is
 * restored to its original context bindings. Keys absent from the core's
 * action map are dropped, which lets a saved payload survive action renames
 * or removals without leaking stale keys back out through `serializeBindings`.
 * @template T - The action map type.
 * @param options - The handle state, action map, context config and the full
 * binding state to apply.
 */
export function applyRebindAll<T extends ActionMap>(options: RebindAllOptions<T>): void {
	const { actions, bindings, contexts, handleData } = options;
	handleData.bindingOverrides.clear();
	const handledActions = new Set<string>();
	for (const [action, platformBindings] of pairs(bindings)) {
		if (actions[action] === undefined) {
			if (_G.__DEV__) {
				warn(`[flux] dropping unknown action from loaded bindings: ${action}`);
			}

			continue;
		}

		const overrides = readPlatformBuckets(platformBindings);
		if (!overrides.isEmpty()) {
			handleData.bindingOverrides.set(action, overrides);
		}

		rebuildFromOverrides({ action, contexts, handleData });
		handledActions.add(action);
	}

	restoreOriginalBindings({ contexts, handleData, skip: handledActions });
}

/**
 * Removes the override for a single action and restores its original bindings.
 * @template T - The action map type.
 * @param options - The action, handle state and context config.
 */
export function applyResetOne<T extends ActionMap>(options: ActionScopedOptions<T>): void {
	const { action, contexts, handleData } = options;
	handleData.bindingOverrides.delete(action);
	rebuildFromOverrides({ action, contexts, handleData });
}

/**
 * Removes one platform's override bucket for an action, restoring that
 * platform's context defaults. The other platforms' buckets are not read and
 * not written, so their customizations survive untouched.
 * @template T - The action map type.
 * @param options - The action, platform, handle state and context config.
 */
export function applyResetForPlatform<T extends ActionMap>(
	options: PlatformScopedOptions<T>,
): void {
	const { action, contexts, handleData, platform } = options;
	const overrides = handleData.bindingOverrides.get(action);
	if (overrides?.get(platform) === undefined) {
		// Nothing was overridden for this platform, so the instances already
		// hold its defaults — rebuilding would destroy and recreate them for
		// no change.
		return;
	}

	overrides.delete(platform);
	if (overrides.isEmpty()) {
		handleData.bindingOverrides.delete(action);
	}

	rebuildFromOverrides({ action, contexts, handleData });
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
	restoreOriginalBindings({ contexts, handleData });
}

/**
 * Serializes the handle's active binding overrides, per platform.
 *
 * The result is sparse at both levels. An action with no override at all is
 * absent, and within an action a platform the player never touched is absent
 * too — on load both are restored from the current code's defaults, so an
 * untouched platform keeps inheriting changes to them. A platform present
 * with an empty array is a deliberate unbind and loads back as unbound.
 * @template T - The action map type.
 * @param handleData - Handle state to read.
 * @returns A sparse record of per-platform overrides keyed by action name.
 */
export function serializeFullBindings<T extends ActionMap>(
	handleData: HandleData<T>,
): SerializedBindings {
	const result: Writable<SerializedBindings> = {};
	for (const [actionName, overrides] of handleData.bindingOverrides) {
		const entry: Writable<PlatformBindings> = {};
		for (const platform of PLATFORM_ORDER) {
			const bucket = overrides.get(platform);
			if (bucket !== undefined) {
				entry[platform] = [...bucket];
			}
		}

		result[actionName] = entry;
	}

	return result;
}

/**
 * Replays active overrides onto a single freshly-activated InputContext.
 * Lets `addContext` hydrate the new context so rebinds applied before
 * activation still take effect when the context comes online.
 *
 * The replayed list is composed per platform against the new context's own
 * defaults, so a platform the player never overrode picks up that context's
 * declared bindings rather than being dropped.
 * @template T - The action map type.
 * @param options - The handle state, context config and the name of the
 * context that was just activated.
 */
export function replayOverridesIntoContext<T extends ActionMap>(options: ReplayOptions<T>): void {
	const { contextName, contexts, handleData } = options;
	if (handleData.bindingOverrides.isEmpty()) {
		return;
	}

	const actionInstances = handleData.instanceData.actionsByContext.get(contextName);
	assert(actionInstances, `context not registered: ${contextName}`);
	for (const [actionName, overrides] of handleData.bindingOverrides) {
		const inputAction = actionInstances.get(actionName);
		if (inputAction === undefined) {
			continue;
		}

		const destroyed = new Set<Instance>();
		destroyChildrenInto(inputAction, destroyed);
		pruneInstances(handleData.instanceData.instances, destroyed);
		const bindings = composeBindings(
			overrides,
			contextDefaults({ action: actionName, contextName, contexts }),
		);
		createBindingsForAction(bindings, inputAction, handleData.instanceData.instances);
	}
}

function destroyChildrenInto(inputAction: InputAction, destroyed: Set<Instance>): void {
	for (const child of inputAction.GetChildren()) {
		destroyed.add(child);
		child.Destroy();
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

function pruneInstances(instances: Array<Instance>, destroyed: Set<Instance>): void {
	for (let index = instances.size() - 1; index >= 0; index -= 1) {
		const instance = instances[index];
		if (instance !== undefined && destroyed.has(instance)) {
			instances.remove(index);
		}
	}
}

/**
 * Builds a lazy reader for the bindings a context declares for an action.
 *
 * {@link composeBindings} only calls it when some platform still falls
 * through to the defaults, so the lookup is skipped for a fully-overridden
 * action.
 * @param options - The context config, context name and action to read.
 * @returns A thunk reading that context's declared bindings.
 */
function contextDefaults(options: ContextDefaultsOptions): () => ReadonlyArray<BindingLike> {
	const { action, contextName, contexts } = options;
	return () => getContextBindings(contexts, contextName, action);
}

/**
 * Rebuilds one action's `InputBinding` instances from its current override
 * buckets, composing each context's own defaults in for platforms the buckets
 * leave absent.
 * @template T - The action map type.
 * @param options - The action, handle state and context config.
 */
function rebuildFromOverrides<T extends ActionMap>(options: ActionScopedOptions<T>): void {
	const { action, contexts, handleData } = options;
	const overrides = handleData.bindingOverrides.get(action);
	rebuildActionBindings(handleData.instanceData, action, (contextName) => {
		return composeBindings(overrides, contextDefaults({ action, contextName, contexts }));
	});
}

/**
 * Reads a serialized action entry into override buckets, keeping only the
 * platforms the payload actually carries so absent ones resume tracking
 * defaults.
 * @param platformBindings - One action's serialized per-platform entry.
 * @returns The buckets the entry declares, possibly none.
 */
function readPlatformBuckets(platformBindings: PlatformBindings): PlatformOverrides {
	const overrides: PlatformOverrides = new Map();
	for (const platform of PLATFORM_ORDER) {
		const bucket = platformBindings[platform];
		if (bucket !== undefined) {
			overrides.set(platform, [...bucket]);
		}
	}

	return overrides;
}

function collectActionNames(data: InputInstanceData): Set<string> {
	const names = new Set<string>();
	for (const [, actionInstances] of data.actionsByContext) {
		for (const [actionName] of actionInstances) {
			names.add(actionName);
		}
	}

	return names;
}

/**
 * Restores every action the handle has instances for to its per-context
 * original bindings.
 *
 * Callers reach here only after clearing the overrides for the actions in
 * scope, so this is {@link rebuildFromOverrides} in its no-override case
 * rather than a second definition of what a default composes to.
 * @template T - The action map type.
 * @param options - The handle state, context config and actions to skip.
 */
function restoreOriginalBindings<T extends ActionMap>(options: RestoreOptions<T>): void {
	const { contexts, handleData, skip } = options;
	for (const action of collectActionNames(handleData.instanceData)) {
		if (skip?.has(action) === true) {
			continue;
		}

		rebuildFromOverrides({ action, contexts, handleData });
	}
}
