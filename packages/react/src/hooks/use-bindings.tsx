import type { ActionMap, AllActions, BindingLike, InputHandle, InputPlatform } from "@rbxts/flux";
import { useCallback, useEffect, useMemo, useRef, useState } from "@rbxts/react";

import type { FluxContextValue } from "../flux-context";

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
		const action = hasStringFirst ? handleOrAction : (actionOrPlatform as AllActions<T>);
		const platform = hasStringFirst
			? (actionOrPlatform as InputPlatform | undefined)
			: maybePlatform;

		const getBindingsValue = useMemo(() => {
			return (): ReadonlyArray<BindingLike> => {
				if (platform !== undefined) {
					return core.getBindingsForPlatform(handle, action, platform);
				}

				return core.getBindings(handle, action);
			};
		}, [core, handle, action, platform]);

		const [value, setValue] = useState(getBindingsValue);
		// Mirrors the rendered value so a resolve can be compared against it
		// without re-rendering. Every write to `setValue` updates it first, so
		// it needs no effect of its own to stay in step.
		const lastValueRef = useRef(value);
		const hasResolvedRef = useRef(false);

		const publishIfChanged = useCallback((): void => {
			const updated = getBindingsValue();
			if (shallowArrayEqual(lastValueRef.current, updated)) {
				return;
			}

			lastValueRef.current = updated;
			setValue(updated);
		}, [getBindingsValue]);

		useEffect(() => {
			// `useState` already resolved with this reader on mount; re-running
			// here would resolve the same bindings a second time per mount.
			// Later runs mean a dependency changed, so the reader is new.
			if (!hasResolvedRef.current) {
				hasResolvedRef.current = true;
				return;
			}

			publishIfChanged();
		}, [publishIfChanged]);

		useEffect(() => subscribe(publishIfChanged), [subscribe, publishIfChanged]);

		return value;
	}

	return useBindings;
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
