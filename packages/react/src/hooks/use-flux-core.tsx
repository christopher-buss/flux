import type { ActionMap, FluxCore } from "@rbxts/flux";

import type { FluxContextValue } from "../flux-context";

/**
 * `useFluxCore` hook type.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
export type FluxUseFluxCore<T extends ActionMap, Contexts extends string> = () => FluxCore<
	T,
	Contexts
>;

/**
 * - Builds the `useFluxCore` hook for a FluxReact instance.
 * - Returns the `FluxCore` supplied to the nearest `<FluxProvider>`. Useful
 *   for imperative calls like `core.addContext(handle, "menu")` from inside
 *   a component without having to pass `core` down as a prop.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param useFluxContext - Shared accessor for the Provider context value.
 * @returns A typed `useFluxCore` hook.
 */
export function createUseFluxCore<T extends ActionMap, Contexts extends string>(
	useFluxContext: () => FluxContextValue<T, Contexts>,
): FluxUseFluxCore<T, Contexts> {
	return (): FluxCore<T, Contexts> => useFluxContext().core;
}
