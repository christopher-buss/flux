import type { ActionMap, FluxCore } from "@rbxts/flux";

import type { FluxContextValue } from "../flux-context";
import type { AnyFluxSource, FluxSourceHandle } from "../flux-source";

/**
 * `useFluxCore` hook type.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @template Source - The source supplied to the Provider; `FluxCore` by default.
 */
export type FluxUseFluxCore<
	T extends ActionMap,
	Contexts extends string,
	Source extends AnyFluxSource<T, Contexts> = FluxCore<T, Contexts>,
> = () => Source;

/**
 * - Builds the `useFluxCore` hook for a FluxReact instance.
 * - Returns the source supplied to the nearest `<FluxProvider>`: the
 *   `FluxCore`, or the integration wrapper (such as `FluxJecs`) when the
 *   factory was typed with one. Useful for imperative calls like
 *   `core.addContext(handle, "menu")` from inside a component without having
 *   to pass `core` down as a prop.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @template Source - The source supplied to the Provider.
 * @param useFluxContext - Shared accessor for the Provider context value.
 * @returns A typed `useFluxCore` hook.
 */
export function createUseFluxCore<
	T extends ActionMap,
	Contexts extends string,
	Source extends AnyFluxSource<T, Contexts>,
>(
	useFluxContext: () => FluxContextValue<T, Contexts, FluxSourceHandle<Source>, Source>,
): FluxUseFluxCore<T, Contexts, Source> {
	return (): Source => useFluxContext().core;
}
