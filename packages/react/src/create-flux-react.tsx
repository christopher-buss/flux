import type { ActionMap, FluxCore } from "@rbxts/flux";
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
	/** The underlying FluxCore instance. */
	readonly core: FluxCore<T, Contexts>;

	/**
	 * Notify React hooks that ActionState has been updated.
	 *
	 * In standalone mode this fires automatically after Heartbeat. In wrap
	 * mode, call this after your own `core.update(dt)`.
	 */
	readonly flush: () => void;

	/**
	 * Provides Flux context to child components.
	 *
	 * Components below this provider can call any Flux hook to reactively read
	 * input state for the configured handle.
	 */
	// eslint-disable-next-line flawless/naming-convention -- React component
	readonly FluxProvider: (props: FluxProviderProps) => React.ReactNode;

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
 * Options for creating a FluxReact instance in wrap mode.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
export interface FluxReactWrapOptions<T extends ActionMap, Contexts extends string = string> {
	/** An existing FluxCore instance to wrap. */
	readonly core: FluxCore<T, Contexts>;
}

/**
 * - Creates a FluxReact instance for React integration.
 * - Returns the core, a flush function, a Provider component, and typed hooks.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param options - Wrap options containing an existing FluxCore.
 * @returns A FluxReact instance with typed hooks.
 */
export function createFluxReact<T extends ActionMap, Contexts extends string = string>(
	options: FluxReactWrapOptions<T, Contexts>,
): FluxReact<T, Contexts> {
	const { core } = options;
	const signal = createUpdateSignal();

	// eslint-disable-next-line flawless/naming-convention -- React convention
	const FluxContext = createContext<FluxContextValue<T> | undefined>(undefined);
	FluxContext.displayName = "FluxContext";

	const useFluxContext = createUseFluxContext(FluxContext);

	return {
		core,
		flush: signal.fire,
		FluxProvider: createFluxProvider(core, FluxContext, signal.subscribe),
		useAction: createUseAction(useFluxContext),
		useActiveContext: createUseActiveContext<T, Contexts>(core, useFluxContext),
		useBindings: createUseBindings(core, useFluxContext),
		useInputContext: createUseInputContext<T, Contexts>(core, useFluxContext),
	};
}
