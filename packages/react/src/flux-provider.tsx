import type { ActionMap, FluxCore, InputHandle } from "@rbxts/flux";
import React, { useMemo } from "@rbxts/react";

import type { FluxContextValue } from "./flux-context";
import type { Disconnect } from "./update-signal";

/**
 * Props for the FluxProvider component.
 */
export interface FluxProviderProps {
	/** The default InputHandle for hooks that omit the handle argument. */
	readonly handle: InputHandle;
	/** Child elements rendered inside the provider. */
	readonly children?: React.ReactNode;
}

/**
 * - Builds the FluxProvider component for a FluxReact instance.
 * - The component memoizes its context value per `handle` so descendant hooks
 *   only resubscribe when the default handle actually changes.
 *
 * @template T - The action map type.
 * @param core - The underlying FluxCore instance.
 * @param FluxContext - The React context that backs this provider.
 * @param subscribe - Update-signal subscribe function.
 * @returns A FluxProvider component.
 */
export function createFluxProvider<T extends ActionMap>(
	core: FluxCore<T>,
	// eslint-disable-next-line flawless/naming-convention -- React convention
	FluxContext: React.Context<FluxContextValue<T> | undefined>,
	subscribe: (listener: () => void) => Disconnect,
): (props: FluxProviderProps) => React.ReactNode {
	return (props: FluxProviderProps): React.ReactNode => {
		const { handle, children } = props;

		const contextValue = useMemo<FluxContextValue<T>>(() => {
			return {
				getState: (inputHandle: InputHandle) => core.getState(inputHandle),
				handle,
				subscribe,
			};
		}, [handle]);

		return <FluxContext.Provider value={contextValue}>{children}</FluxContext.Provider>;
	};
}
