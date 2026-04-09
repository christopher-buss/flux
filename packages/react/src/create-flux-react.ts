import type { ActionMap, ActionState, FluxCore, InputHandle } from "@rbxts/flux";
import React, { createContext, useContext, useEffect, useMemo, useState } from "@rbxts/react";

import type { Disconnect } from "./update-signal";
import { createUpdateSignal } from "./update-signal";

/**
 * Props for the FluxProvider component.
 */
export interface FluxProviderProps {
	/** Child elements. */
	readonly children?: React.ReactNode;

	/** The default InputHandle for hooks that omit the handle argument. */
	readonly handle: InputHandle;
}

/**
 * Overloaded useAction hook type.
 * @template T - The action map type.
 */
export interface FluxUseAction<T extends ActionMap> {
	/**
	 * Subscribe to ActionState changes via a selector.
	 *
	 * @template R - The selected value type.
	 * @param selector - Function that extracts a value from ActionState.
	 * @returns The selected value.
	 */
	<R>(selector: (state: ActionState<T>) => R): R;

	/**
	 * Subscribe to ActionState changes via a selector with explicit handle.
	 *
	 * @template R - The selected value type.
	 * @param handle - The InputHandle to query (overrides Provider default).
	 * @param selector - Function that extracts a value from ActionState.
	 * @returns The selected value.
	 */
	<R>(handle: InputHandle, selector: (state: ActionState<T>) => R): R;
}

/**
 * The return type of createFluxReact.
 * @template T - The action map type.
 */
export interface FluxReact<T extends ActionMap> {
	/** The underlying FluxCore instance. */
	readonly core: FluxCore<T>;

	/**
	 * Notify React hooks that ActionState has been updated.
	 *
	 * In standalone mode this fires automatically after Heartbeat.
	 * In wrap mode, call this after your own `core.update(dt)`.
	 */
	readonly flush: () => void;

	/**
	 * Provides Flux context to child components.
	 *
	 * Components below this provider can call `useAction` to reactively
	 * read ActionState.
	 */
	// eslint-disable-next-line flawless/naming-convention -- React component
	readonly FluxProvider: (props: FluxProviderProps) => React.ReactNode;

	/**
	 * Hook that subscribes to ActionState changes via a selector.
	 * Re-renders only when the selected value changes.
	 */
	readonly useAction: FluxUseAction<T>;
}

/**
 * Options for creating a FluxReact instance in wrap mode.
 * @template T - The action map type.
 */
export interface FluxReactWrapOptions<T extends ActionMap> {
	/** An existing FluxCore instance to wrap. */
	readonly core: FluxCore<T>;
}

interface FluxContextValue<T extends ActionMap> {
	readonly getState: (handle: InputHandle) => ActionState<T>;
	readonly handle: InputHandle;
	readonly subscribe: (listener: () => void) => Disconnect;
}

/**
 * Creates a FluxReact instance for React integration.
 *
 * Returns the core, a flush function, a Provider component, and typed hooks.
 *
 * @template T - The action map type.
 * @param options - Wrap options containing an existing FluxCore.
 * @returns A FluxReact instance with typed hooks.
 */
export function createFluxReact<T extends ActionMap>(
	options: FluxReactWrapOptions<T>,
): FluxReact<T> {
	const { core } = options;
	const signal = createUpdateSignal();

	// eslint-disable-next-line flawless/naming-convention -- React convention
	const FluxContext = createContext<FluxContextValue<T> | undefined>(undefined);

	const useFluxContext = createUseFluxContext(FluxContext);

	return {
		core,
		flush: signal.fire,
		FluxProvider: createFluxProvider(core, FluxContext, signal.subscribe),
		useAction: createUseAction(useFluxContext),
	};
}

function createUseFluxContext<T extends ActionMap>(
	context: React.Context<FluxContextValue<T> | undefined>,
): () => FluxContextValue<T> {
	return () => {
		const value = useContext(context);
		assert(value !== undefined, "useAction must be used within a FluxProvider");

		return value;
	};
}

function createFluxProvider<T extends ActionMap>(
	core: FluxCore<T>,
	// eslint-disable-next-line flawless/naming-convention -- React convention
	FluxContext: React.Context<FluxContextValue<T> | undefined>,
	subscribe: (listener: () => void) => Disconnect,
): (props: FluxProviderProps) => React.ReactNode {
	return (props: FluxProviderProps): React.ReactNode => {
		const { children, handle } = props;

		const contextValue = useMemo(() => {
			return {
				getState: (inputHandle: InputHandle) => core.getState(inputHandle),
				handle,
				subscribe,
			};
		}, [handle]);

		return React.createElement(FluxContext.Provider, { value: contextValue }, children);
	};
}

function createUseAction<T extends ActionMap>(
	useFluxContext: () => FluxContextValue<T>,
): FluxUseAction<T> {
	function useAction<R>(selector: (state: ActionState<T>) => R): R;
	function useAction<R>(handle: InputHandle, selector: (state: ActionState<T>) => R): R;
	function useAction<R>(
		handleOrSelector: ((state: ActionState<T>) => R) | InputHandle,
		maybeSelector?: (state: ActionState<T>) => R,
	): R {
		const context = useFluxContext();

		const handle =
			maybeSelector !== undefined ? (handleOrSelector as InputHandle) : context.handle;
		const selector = maybeSelector ?? (handleOrSelector as (state: ActionState<T>) => R);

		const state = context.getState(handle);
		const [value, setValue] = useState(() => selector(state));

		useEffect(() => {
			return context.subscribe(() => {
				const updated = selector(context.getState(handle));

				setValue((previous) => {
					if (previous === updated) {
						return previous;
					}

					return updated;
				});
			});
		}, [context, handle, selector]);

		return value;
	}

	return useAction;
}
