import type {
	ActionMap,
	AllActions,
	BindingLike,
	FluxCore,
	InputHandle,
	InputPlatform,
} from "@rbxts/flux";
import { getBindingsForPlatform } from "@rbxts/flux";
import { useEffect, useMemo, useRef, useState } from "@rbxts/react";

import type { FluxContextValue } from "./flux-context";

/**
 * Overloaded `useBindings` hook type.
 *
 * @template T - The action map type.
 */
export interface FluxUseBindings<T extends ActionMap> {
	/**
	 * Subscribe to binding changes for an action, optionally filtered by platform.
	 *
	 * @param action - The action name to query bindings for.
	 * @param platform - Optional platform to filter bindings by.
	 * @returns Read-only array of bindings for the action.
	 */
	(action: AllActions<T>, platform?: InputPlatform): ReadonlyArray<BindingLike>;

	/**
	 * Subscribe to binding changes for an action with explicit handle.
	 *
	 * @param handle - The InputHandle to query (overrides Provider default).
	 * @param action - The action name to query bindings for.
	 * @param platform - Optional platform to filter bindings by.
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
 * @param core - The underlying FluxCore instance.
 * @param useFluxContext - Shared accessor for the Provider context value.
 * @returns A typed `useBindings` hook.
 */
export function createUseBindings<T extends ActionMap>(
	core: FluxCore<T>,
	useFluxContext: () => FluxContextValue<T>,
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
		const { handle: defaultHandle, subscribe } = useFluxContext();

		const hasStringFirst = typeIs(handleOrAction, "string");
		const handle = hasStringFirst ? defaultHandle : handleOrAction;
		const action = hasStringFirst ? handleOrAction : (actionOrPlatform as AllActions<T>);
		const platform = hasStringFirst
			? (actionOrPlatform as InputPlatform | undefined)
			: maybePlatform;

		const getBindingsValue = useMemo(() => {
			return (): ReadonlyArray<BindingLike> => {
				const bindings = core.getBindings(handle, action);
				if (platform !== undefined) {
					return getBindingsForPlatform(bindings, platform);
				}

				return bindings;
			};
		}, [handle, action, platform]);

		const [value, setValue] = useState(getBindingsValue);
		const lastValueRef = useRef(value);

		useEffect(() => {
			lastValueRef.current = value;
		});

		useEffect(() => {
			const updated = getBindingsValue();
			if (shallowArrayEqual(lastValueRef.current, updated)) {
				return;
			}

			lastValueRef.current = updated;
			setValue(updated);
		}, [getBindingsValue]);

		useEffect(() => {
			return subscribe(() => {
				const updated = getBindingsValue();
				if (shallowArrayEqual(lastValueRef.current, updated)) {
					return;
				}

				lastValueRef.current = updated;
				setValue(updated);
			});
		}, [subscribe, getBindingsValue]);

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
