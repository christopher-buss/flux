import type { ActionMap, InputHandle } from "@rbxts/flux";
import type React from "@rbxts/react";
import { useContext } from "@rbxts/react";

import type { FluxSource } from "./flux-source";
import type { Disconnect } from "./update-signal";

/**
 * Internal Provider context value shared by every Flux React hook.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @template Handle - The handle type the source is keyed by.
 * @template Source - The source supplied to the FluxProvider.
 */
export interface FluxContextValue<
	T extends ActionMap,
	Contexts extends string = string,
	Handle extends number = InputHandle,
	Source extends FluxSource<T, Contexts, Handle> = FluxSource<T, Contexts, Handle>,
> {
	/** The source supplied to the FluxProvider. */
	readonly core: Source;
	/** Reads the latest explicit-flush publication version. */
	readonly getVersion: () => number;
	/** Default handle to use when a hook omits the handle argument. */
	readonly handle: Handle;
	/** Subscribes a listener to update-signal flushes. */
	readonly subscribe: (listener: () => void) => Disconnect;
}

/**
 * - Builds the shared `useFluxContext` accessor for a FluxReact instance.
 * - Returns a hook that reads the Provider context and asserts that it was
 *   mounted under a FluxProvider.
 *
 * @template Value - The Provider context value type.
 * @param FluxContext - The React context created by the FluxReact factory.
 * @returns A hook that returns the current context value.
 */
export function createUseFluxContext<Value extends object>(
	FluxContext: React.Context<undefined | Value>,
): () => Value {
	return () => {
		const value = useContext(FluxContext);
		assert(value !== undefined, "Flux hooks must be used within a FluxProvider");

		return value;
	};
}
