import type { ActionMap, FluxCore, InputHandle } from "@rbxts/flux";
import type React from "@rbxts/react";
import { useContext } from "@rbxts/react";

import type { Disconnect } from "./update-signal";

/**
 * Internal Provider context value shared by every Flux React hook.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
export interface FluxContextValue<T extends ActionMap, Contexts extends string = string> {
	/** The FluxCore instance supplied to the FluxProvider. */
	readonly core: FluxCore<T, Contexts>;
	/** Default InputHandle to use when a hook omits the handle argument. */
	readonly handle: InputHandle;
	/** Subscribes a listener to update-signal flushes. */
	readonly subscribe: (listener: () => void) => Disconnect;
}

/**
 * - Builds the shared `useFluxContext` accessor for a FluxReact instance.
 * - Returns a hook that reads the Provider context and asserts that it was
 *   mounted under a FluxProvider.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param context - The React context created by the FluxReact factory.
 * @returns A hook that returns the current `FluxContextValue<T, Contexts>`.
 */
export function createUseFluxContext<T extends ActionMap, Contexts extends string = string>(
	context: React.Context<FluxContextValue<T, Contexts> | undefined>,
): () => FluxContextValue<T, Contexts> {
	return () => {
		const value = useContext(context);
		assert(value !== undefined, "Flux hooks must be used within a FluxProvider");

		return value;
	};
}
