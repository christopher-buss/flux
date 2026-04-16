import type { ActionMap, AllActions, InputHandle } from "@rbxts/flux";
import { useEffect, useMemo, useRef, useState } from "@rbxts/react";

import type { FluxContextValue } from "../flux-context";

/**
 * Overloaded `useActiveContext` hook type.
 *
 * @template Contexts - Union of valid context name literals.
 */
export interface FluxUseActiveContext<Contexts extends string> {
	/**
	 * Subscribe to whether a context is active for the Provider's handle.
	 *
	 * @param context - The context name to check.
	 * @returns True if the context is currently active.
	 */
	(context: Contexts): boolean;

	/**
	 * Subscribe to whether a context is active for an explicit handle.
	 *
	 * @param handle - The InputHandle to query (overrides Provider default).
	 * @param context - The context name to check.
	 * @returns True if the context is currently active.
	 */
	(handle: InputHandle, context: Contexts): boolean;
}

/**
 * Shape returned by `useInputContext` — combines static config with live
 * active state for a context.
 *
 * @template T - The action map type.
 */
export interface FluxInputContextInfo<T extends ActionMap> {
	/** Actions declared in this context. */
	readonly actions: ReadonlyArray<AllActions<T>>;
	/** Whether the context is currently active for the queried handle. */
	readonly isActive: boolean;
	/** Priority level from the context config. */
	readonly priority: number;
	/** Whether this context sinks input. */
	readonly sink: boolean;
}

/**
 * Overloaded `useInputContext` hook type.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
export interface FluxUseInputContext<T extends ActionMap, Contexts extends string> {
	/**
	 * Subscribe to a context's info for the Provider's handle.
	 *
	 * @param context - The context name to query.
	 * @returns Combined static config plus live `isActive` state.
	 */
	(context: Contexts): FluxInputContextInfo<T>;

	/**
	 * Subscribe to a context's info for an explicit handle.
	 *
	 * @param handle - The InputHandle to query (overrides Provider default).
	 * @param context - The context name to query.
	 * @returns Combined static config plus live `isActive` state.
	 */
	(handle: InputHandle, context: Contexts): FluxInputContextInfo<T>;
}

/**
 * - Builds the `useActiveContext` hook for a FluxReact instance.
 * - Returns a boolean that flips only when the queried context's active state
 *   actually changes; uses ref-based bail-out matching `useAction`.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param useFluxContext - Shared accessor for the Provider context value.
 * @returns A typed `useActiveContext` hook.
 */
export function createUseActiveContext<T extends ActionMap, Contexts extends string>(
	useFluxContext: () => FluxContextValue<T, Contexts>,
): FluxUseActiveContext<Contexts> {
	function useActiveContext(context: Contexts): boolean;
	function useActiveContext(handle: InputHandle, context: Contexts): boolean;
	function useActiveContext(
		handleOrContext: Contexts | InputHandle,
		maybeContext?: Contexts,
	): boolean {
		const { core, handle: defaultHandle, subscribe } = useFluxContext();

		const handle =
			maybeContext !== undefined ? (handleOrContext as InputHandle) : defaultHandle;
		const context = maybeContext ?? (handleOrContext as Contexts);

		const getActive = useMemo(
			() => (): boolean => core.hasContext(handle, context),
			[core, handle, context],
		);

		const [isActive, setIsActive] = useState(getActive);
		const lastActiveRef = useRef(isActive);

		useEffect(() => {
			lastActiveRef.current = isActive;
		});

		useEffect(() => {
			const isActiveNow = getActive();
			if (lastActiveRef.current === isActiveNow) {
				return;
			}

			lastActiveRef.current = isActiveNow;
			setIsActive(isActiveNow);
		}, [getActive]);

		useEffect(() => {
			return subscribe(() => {
				const isActiveNow = getActive();
				if (lastActiveRef.current === isActiveNow) {
					return;
				}

				lastActiveRef.current = isActiveNow;
				setIsActive(isActiveNow);
			});
		}, [subscribe, getActive]);

		return isActive;
	}

	return useActiveContext;
}

/**
 * - Builds the `useInputContext` hook for a FluxReact instance.
 * - Memoizes the static slice (priority, sink, actions) per `[handle, context]`
 *   and only rebuilds the returned object when `isActive` flips. Static fields
 *   stay referentially stable across flushes.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param useFluxContext - Shared accessor for the Provider context value.
 * @returns A typed `useInputContext` hook.
 */
export function createUseInputContext<T extends ActionMap, Contexts extends string>(
	useFluxContext: () => FluxContextValue<T, Contexts>,
): FluxUseInputContext<T, Contexts> {
	function useInputContext(context: Contexts): FluxInputContextInfo<T>;
	function useInputContext(handle: InputHandle, context: Contexts): FluxInputContextInfo<T>;
	function useInputContext(
		handleOrContext: Contexts | InputHandle,
		maybeContext?: Contexts,
	): FluxInputContextInfo<T> {
		const { core, handle: defaultHandle, subscribe } = useFluxContext();

		const handle =
			maybeContext !== undefined ? (handleOrContext as InputHandle) : defaultHandle;
		const context = maybeContext ?? (handleOrContext as Contexts);

		const staticSlice = useMemo(() => {
			const sourceInfo = core.getContextInfo(handle, context);
			return {
				actions: sourceInfo.actions,
				priority: sourceInfo.priority,
				sink: sourceInfo.sink,
			};
		}, [core, handle, context]);

		const getInfo = useMemo(() => {
			return (): FluxInputContextInfo<T> => {
				return { ...staticSlice, isActive: core.hasContext(handle, context) };
			};
		}, [core, handle, context, staticSlice]);

		const [info, setInfo] = useState(getInfo);
		const lastActiveRef = useRef(info.isActive);
		const lastInfoRef = useRef(info);

		useEffect(() => {
			lastActiveRef.current = info.isActive;
			lastInfoRef.current = info;
		});

		useEffect(() => {
			const updatedInfo = getInfo();
			if (
				lastInfoRef.current.actions === updatedInfo.actions &&
				lastInfoRef.current.isActive === updatedInfo.isActive
			) {
				return;
			}

			lastActiveRef.current = updatedInfo.isActive;
			lastInfoRef.current = updatedInfo;
			setInfo(updatedInfo);
		}, [getInfo]);

		useEffect(() => {
			return subscribe(() => {
				const isActiveNow = core.hasContext(handle, context);
				if (lastActiveRef.current === isActiveNow) {
					return;
				}

				const updatedInfo = getInfo();
				lastActiveRef.current = updatedInfo.isActive;
				lastInfoRef.current = updatedInfo;
				setInfo(updatedInfo);
			});
		}, [subscribe, core, handle, context, getInfo]);

		return info;
	}

	return useInputContext;
}
