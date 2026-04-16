import type { ActionMap, FluxCore, InputHandle } from "@rbxts/flux";
import React, { useMemo } from "@rbxts/react";

import type { FluxContextValue } from "./flux-context";
import type { Disconnect } from "./update-signal";

/**
 * Props for the FluxProvider component.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
export interface FluxProviderProps<T extends ActionMap, Contexts extends string = string> {
	/** The FluxCore instance to expose to descendant hooks. */
	readonly core: FluxCore<T, Contexts>;
	/** The default InputHandle for hooks that omit the handle argument. */
	readonly handle: InputHandle;
	/** Child elements rendered inside the provider. */
	readonly children?: React.ReactNode;
}

/**
 * - Builds the FluxProvider component for a FluxReact instance.
 * - The component memoizes its context value per `[core, handle]` so
 *   descendant hooks only resubscribe when the core or default handle
 *   actually changes.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param FluxContext - The React context that backs this provider.
 * @param subscribe - Update-signal subscribe function.
 * @returns A FluxProvider component.
 */
export function createFluxProvider<T extends ActionMap, Contexts extends string = string>(
	// eslint-disable-next-line flawless/naming-convention -- React convention
	FluxContext: React.Context<FluxContextValue<T, Contexts> | undefined>,
	subscribe: (listener: () => void) => Disconnect,
): (props: FluxProviderProps<T, Contexts>) => React.ReactNode {
	return (props: FluxProviderProps<T, Contexts>): React.ReactNode => {
		const { core, handle, children } = props;

		const contextValue = useMemo<FluxContextValue<T, Contexts>>(() => {
			return {
				core,
				handle,
				subscribe,
			};
		}, [core, handle]);

		return <FluxContext.Provider value={contextValue}>{children}</FluxContext.Provider>;
	};
}
