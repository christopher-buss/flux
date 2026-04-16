import type { ActionMap, ActionState, InputHandle } from "@rbxts/flux";
import { useEffect, useRef, useState } from "@rbxts/react";

import type { FluxContextValue } from "../flux-context";

/**
 * Overloaded `useAction` hook type.
 *
 * @template T - The action map type.
 */
export interface FluxUseAction<T extends ActionMap> {
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
	 * @param handle - The InputHandle to query (overrides Provider default).
	 * @param selector - Function that extracts a value from ActionState.
	 * @returns The selected value.
	 */
	<R>(handle: InputHandle, selector: (state: ActionState<T>) => R): R;
}

/**
 * - Builds the `useAction` hook for a FluxReact instance.
 * - Uses ref-based bail-out (NOT `setValue(prev)`) because React-Lua does not
 *   reliably skip rerenders on the first post-change flush when the functional
 *   updater returns the previous value.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param useFluxContext - Shared accessor for the Provider context value.
 * @returns A typed `useAction` hook.
 */
export function createUseAction<T extends ActionMap, Contexts extends string = string>(
	useFluxContext: () => FluxContextValue<T, Contexts>,
): FluxUseAction<T> {
	function useAction<R>(selector: (state: ActionState<T>) => R): R;
	function useAction<R>(handle: InputHandle, selector: (state: ActionState<T>) => R): R;
	function useAction<R>(
		handleOrSelector: ((state: ActionState<T>) => R) | InputHandle,
		maybeSelector?: (state: ActionState<T>) => R,
	): R {
		const context = useFluxContext();

		const handle =
			maybeSelector !== undefined ? (handleOrSelector as InputHandle) : context.handle;
		const selector = maybeSelector ?? (handleOrSelector as (state: ActionState<T>) => R);

		const state = context.core.getState(handle);
		const [value, setValue] = useState(() => selector(state));
		const lastValueRef = useRef(value);

		useEffect(() => {
			lastValueRef.current = value;
		});

		useEffect(() => {
			return context.subscribe(() => {
				const updated = selector(context.core.getState(handle));
				if (lastValueRef.current === updated) {
					return;
				}

				lastValueRef.current = updated;
				setValue(updated);
			});
		}, [context, handle, selector]);

		return value;
	}

	return useAction;
}
