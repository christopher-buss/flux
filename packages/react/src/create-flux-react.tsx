import type { ActionMap } from "@rbxts/flux";
import type React from "@rbxts/react";
import { createContext } from "@rbxts/react";

import type { FluxContextValue } from "./flux-context";
import { createUseFluxContext } from "./flux-context";
import type { FluxProviderProps } from "./flux-provider";
import { createFluxProvider } from "./flux-provider";
import type { FluxUseAction } from "./hooks/use-action";
import { createUseAction } from "./hooks/use-action";
import type { FluxUseBindings } from "./hooks/use-bindings";
import { createUseBindings } from "./hooks/use-bindings";
import type { FluxUseActiveContext, FluxUseInputContext } from "./hooks/use-input-context";
import { createUseActiveContext, createUseInputContext } from "./hooks/use-input-context";
import { createUpdateSignal } from "./update-signal";

/**
 * The return type of {@link createFluxReact}.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
export interface FluxReact<T extends ActionMap, Contexts extends string = string> {
	/**
	 * Notify React hooks that ActionState has been updated.
	 *
	 * Call this after your own `core.update(dt)` to wake subscribed hooks.
	 */
	readonly flush: () => void;

	/**
	 * Provides Flux context to child components.
	 *
	 * Components below this provider can call any Flux hook to reactively read
	 * input state for the supplied core and handle.
	 */
	// eslint-disable-next-line flawless/naming-convention -- React component
	readonly FluxProvider: (props: FluxProviderProps<T, Contexts>) => React.ReactNode;

	/**
	 * Hook that subscribes to ActionState changes via a selector. Re-renders
	 * only when the selected value changes.
	 */
	readonly useAction: FluxUseAction<T>;

	/**
	 * Hook that subscribes to a context's active state for a handle.
	 * Re-renders only when the boolean flips.
	 */
	readonly useActiveContext: FluxUseActiveContext<Contexts>;

	/**
	 * Hook that subscribes to binding changes for an action. Re-renders only
	 * when the bindings array changes.
	 */
	readonly useBindings: FluxUseBindings<T>;

	/**
	 * Hook that subscribes to a context's info for a handle.
	 *
	 * Returns static config (priority, sink, declared actions) combined with
	 * live `isActive` state. Re-renders only when `isActive` flips; static
	 * fields are memoized per context name.
	 */
	readonly useInputContext: FluxUseInputContext<T, Contexts>;
}

/**
 * - Creates a FluxReact instance for React integration.
 * - Returns a flush function, a Provider component, and typed hooks. Core is
 *   supplied at render time via `<FluxProvider core={...} handle={...}>` so
 *   the factory can live in a shared module without owning a world or core.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @returns A FluxReact instance with typed hooks.
 * @example
 * ```tsx
 * // shared/flux/react.ts
 * export const { flush, FluxProvider, useAction } = createFluxReact<
 *   typeof actions,
 *   keyof typeof contexts & string
 * >();
 *
 * // client startup
 * const core = createCore({ actions, contexts });
 * root.render(
 *   <FluxProvider core={core} handle={handle}>
 *     <App />
 *   </FluxProvider>,
 * );
 * ```
 */
export function createFluxReact<T extends ActionMap, Contexts extends string = string>(): FluxReact<
	T,
	Contexts
> {
	const signal = createUpdateSignal();

	// eslint-disable-next-line flawless/naming-convention -- React convention
	const FluxContext = createContext<FluxContextValue<T, Contexts> | undefined>(undefined);
	FluxContext.displayName = "FluxContext";

	const useFluxContext = createUseFluxContext(FluxContext);

	return {
		flush: signal.fire,
		FluxProvider: createFluxProvider(FluxContext, signal.subscribe),
		useAction: createUseAction(useFluxContext),
		useActiveContext: createUseActiveContext<T, Contexts>(useFluxContext),
		useBindings: createUseBindings(useFluxContext),
		useInputContext: createUseInputContext<T, Contexts>(useFluxContext),
	};
}
