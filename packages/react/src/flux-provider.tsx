import type { ActionMap, FluxCore } from "@rbxts/flux";
import React, { useMemo } from "@rbxts/react";

import type { FluxContextValue } from "./flux-context";
import type { AnyFluxSource, FluxSourceHandle } from "./flux-source";
import type { Disconnect } from "./update-signal";

/**
 * Props for the FluxProvider component.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @template Source - The source hooks read through; `FluxCore` by default.
 */
export interface FluxProviderProps<
	T extends ActionMap,
	Contexts extends string = string,
	Source extends AnyFluxSource<T, Contexts> = FluxCore<T, Contexts>,
> {
	/**
	 * The source to expose to descendant hooks: a `FluxCore`, or an
	 * integration-layer wrapper such as `FluxJecs`.
	 */
	readonly core: Source;
	/**
	 * The default handle for hooks that omit the handle argument, typed by
	 * the source: an `InputHandle` for `FluxCore`, an `Entity` for `FluxJecs`.
	 */
	readonly handle: FluxSourceHandle<Source>;
	/** Child elements rendered inside the provider. */
	readonly children?: React.ReactNode;
}

/**
 * - Builds the FluxProvider component for a FluxReact instance.
 * - The component memoizes its context value per `[core, handle]` so
 *   descendant hooks only resubscribe when the source or default handle
 *   actually changes.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @template Source - The source hooks read through.
 * @param FluxContext - The React context that backs this provider.
 * @param subscribe - Update-signal subscribe function.
 * @param getVersion - Reads the update signal's publication version.
 * @returns A FluxProvider component.
 */
export function createFluxProvider<
	T extends ActionMap,
	Contexts extends string,
	Source extends AnyFluxSource<T, Contexts>,
>(
	FluxContext: React.Context<
		FluxContextValue<T, Contexts, FluxSourceHandle<Source>, Source> | undefined
	>,
	subscribe: (listener: () => void) => Disconnect,
	getVersion: () => number,
): (props: FluxProviderProps<T, Contexts, Source>) => React.ReactNode {
	return ({
		core,
		handle,
		children,
	}: FluxProviderProps<T, Contexts, Source>): React.ReactNode => {
		const contextValue = useMemo<
			FluxContextValue<T, Contexts, FluxSourceHandle<Source>, Source>
		>(() => {
			return {
				core,
				getVersion,
				handle,
				subscribe,
			};
		}, [core, handle]);

		return <FluxContext.Provider value={contextValue}>{children}</FluxContext.Provider>;
	};
}
