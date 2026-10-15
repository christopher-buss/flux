import type { ActionMap, ActionState, InputHandle } from "@rbxts/flux";
import { useMemo } from "@rbxts/react";

import type { FluxContextValue } from "../flux-context";
import { useSyncExternalStore, useVersionedSnapshot } from "../use-sync-external-store";

/**
 * Overloaded `useAction` hook type.
 *
 * @template T - The action map type.
 * @template Handle - The handle type; `InputHandle` for `FluxCore`.
 */
export interface FluxUseAction<T extends ActionMap, Handle extends number = InputHandle> {
	/**
	 * Subscribe to ActionState changes via a selector.
	 *
	 * @template R - The selected value type.
	 * @param selector - Function that extracts a value from ActionState.
	 * @returns The selected value.
	 */
	<R>(selector: (state: ActionState<T>) => R): R;

	/**
	 * Subscribe to ActionState changes via a selector with explicit handle.
	 *
	 * @template R - The selected value type.
	 * @param handle - The handle to query (overrides Provider default).
	 * @param selector - Function that extracts a value from ActionState.
	 * @returns The selected value.
	 */
	<R>(handle: Handle, selector: (state: ActionState<T>) => R): R;
}

/**
 * Builds the `useAction` hook for a FluxReact instance.
 *
 * Snapshots refresh on explicit flushes or a changed core, handle, or selector.
 * With unchanged dependencies, source changes without a flush remain cached.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @template Handle - The handle type; `InputHandle` for `FluxCore`.
 * @param useFluxContext - Shared accessor for the Provider context value.
 * @returns A typed `useAction` hook.
 */
export function createUseAction<
	T extends ActionMap,
	Contexts extends string = string,
	Handle extends number = InputHandle,
>(useFluxContext: () => FluxContextValue<T, Contexts, Handle>): FluxUseAction<T, Handle> {
	function useAction<R>(selector: (state: ActionState<T>) => R): R;
	function useAction<R>(handle: Handle, selector: (state: ActionState<T>) => R): R;
	function useAction<R>(
		handleOrSelector: ((state: ActionState<T>) => R) | Handle,
		maybeSelector?: (state: ActionState<T>) => R,
	): R {
		const context = useFluxContext();

		const isSelectorFirst = typeIs(handleOrSelector, "function");
		const handle = isSelectorFirst ? context.handle : handleOrSelector;
		const selector = isSelectorFirst ? handleOrSelector : maybeSelector;
		assert(selector !== undefined, "useAction requires a selector");

		const { core, getVersion, subscribe } = context;
		const read = useMemo(() => () => selector(core.getState(handle)), [core, handle, selector]);
		const getSnapshot = useVersionedSnapshot(getVersion, read);

		return useSyncExternalStore(subscribe, getSnapshot);
	}

	return useAction;
}
