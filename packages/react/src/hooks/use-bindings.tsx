import type { ActionMap, AllActions, BindingLike, InputHandle, InputPlatform } from "@rbxts/flux";
import { isInputPlatform } from "@rbxts/flux";
import { useMemo } from "@rbxts/react";

import type { FluxContextValue } from "../flux-context";
import { useCachedSnapshot, useSyncExternalStore } from "../use-sync-external-store";

/**
 * Overloaded `useBindings` hook type.
 *
 * @template T - The action map type.
 */
export interface FluxUseBindings<T extends ActionMap> {
	/**
	 * Subscribe to binding changes for an action, optionally scoped to one
	 * platform.
	 *
	 * A platform scope reads that platform's overrides from core rather than
	 * classifying the composed list, so a binding the player deliberately put
	 * on one platform's row stays on it.
	 *
	 * @param action - The action name to query bindings for.
	 * @param platform - Optional platform to scope the read to.
	 * @returns Read-only array of bindings for the action.
	 */
	(action: AllActions<T>, platform?: InputPlatform): ReadonlyArray<BindingLike>;

	/**
	 * Subscribe to binding changes for an action with explicit handle.
	 *
	 * @param handle - The InputHandle to query (overrides Provider default).
	 * @param action - The action name to query bindings for.
	 * @param platform - Optional platform to scope the read to.
	 * @returns Read-only array of bindings for the action.
	 */
	(
		handle: InputHandle,
		action: AllActions<T>,
		platform?: InputPlatform,
	): ReadonlyArray<BindingLike>;
}

/**
 * - Builds the `useBindings` hook for a FluxReact instance.
 * - Re-renders only when the binding array shallowly differs from the last
 *   rendered value.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param useFluxContext - Shared accessor for the Provider context value.
 * @returns A typed `useBindings` hook.
 */
export function createUseBindings<T extends ActionMap, Contexts extends string = string>(
	useFluxContext: () => FluxContextValue<T, Contexts>,
): FluxUseBindings<T> {
	function useBindings(
		action: AllActions<T>,
		platform?: InputPlatform,
	): ReadonlyArray<BindingLike>;
	function useBindings(
		handle: InputHandle,
		action: AllActions<T>,
		platform?: InputPlatform,
	): ReadonlyArray<BindingLike>;
	function useBindings(
		handleOrAction: AllActions<T> | InputHandle,
		actionOrPlatform?: AllActions<T> | InputPlatform,
		maybePlatform?: InputPlatform,
	): ReadonlyArray<BindingLike> {
		const { core, handle: defaultHandle, subscribe } = useFluxContext();

		const hasStringFirst = typeIs(handleOrAction, "string");
		const handle = hasStringFirst ? defaultHandle : handleOrAction;
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- when a handle leads, arity puts the action in the second slot; action and platform are both string unions, so no runtime guard can recover it
		const action = hasStringFirst ? handleOrAction : (actionOrPlatform as AllActions<T>);
		const platform = hasStringFirst ? toPlatformSlot(actionOrPlatform) : maybePlatform;

		const getBindingsValue = useMemo(() => {
			return (): ReadonlyArray<BindingLike> => {
				if (platform !== undefined) {
					return core.getBindingsForPlatform(handle, action, platform);
				}

				return core.getBindings(handle, action);
			};
		}, [core, handle, action, platform]);

		// Core resolves a fresh array per read, so the store would see every
		// render as a change without this. Shallow equality is the right key:
		// the bindings themselves are interned, only the array is new.
		const getSnapshot = useCachedSnapshot(getBindingsValue, shallowArrayEqual);

		return useSyncExternalStore(subscribe, getSnapshot);
	}

	return useBindings;
}

/**
 * - Resolves the platform slot of the action-first overload.
 * - The merged implementation signature types the slot as an action/platform
 *   union; platforms are a closed literal set, so the guard recovers the
 *   platform side soundly. Typed callers can only pass a platform or nothing
 *   here.
 *
 * @param value - The argument occupying the platform slot.
 * @returns The platform, or `undefined` when the slot was empty.
 */
function toPlatformSlot(value: string | undefined): InputPlatform | undefined {
	return value !== undefined && isInputPlatform(value) ? value : undefined;
}

function shallowArrayEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
	if (a.size() !== b.size()) {
		return false;
	}

	for (let index = 0; index < a.size(); index++) {
		if (a[index] !== b[index]) {
			return false;
		}
	}

	return true;
}
