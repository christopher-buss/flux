import type {
	ActionMap,
	ActionState,
	AllActions,
	BindingLike,
	FluxCore,
	InputHandle,
	InputPlatform,
} from "@rbxts/flux";
import { getBindingsForPlatform } from "@rbxts/flux";
import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "@rbxts/react";

import type { Disconnect } from "./update-signal";
import { createUpdateSignal } from "./update-signal";

/**
 * Props for the FluxProvider component.
 */
export interface FluxProviderProps {
	/** The default InputHandle for hooks that omit the handle argument. */
	readonly handle: InputHandle;

	/** Child elements. */
	readonly children?: React.ReactNode;
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
 * Overloaded useBindings hook type.
 * @template T - The action map type.
 */
export interface FluxUseBindings<T extends ActionMap> {
	/**
	 * Subscribe to binding changes for an action, optionally filtered by platform.
	 *
	 * @param action - The action name to query bindings for.
	 * @param platform - Optional platform to filter bindings by.
	 * @returns Read-only array of bindings for the action.
	 */
	(action: AllActions<T>, platform?: InputPlatform): ReadonlyArray<BindingLike>;

	/**
	 * Subscribe to binding changes for an action with explicit handle.
	 *
	 * @param handle - The InputHandle to query (overrides Provider default).
	 * @param action - The action name to query bindings for.
	 * @param platform - Optional platform to filter bindings by.
	 * @returns Read-only array of bindings for the action.
	 */
	(
		handle: InputHandle,
		action: AllActions<T>,
		platform?: InputPlatform,
	): ReadonlyArray<BindingLike>;
}

/**
 * The return type of createFluxReact.
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
export interface FluxReact<T extends ActionMap, Contexts extends string = string> {
	/** The underlying FluxCore instance. */
	readonly core: FluxCore<T, Contexts>;

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

	/**
	 * Hook that subscribes to binding changes for an action.
	 * Re-renders only when the bindings array changes.
	 */
	readonly useBindings: FluxUseBindings<T>;
}

/**
 * Options for creating a FluxReact instance in wrap mode.
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
export interface FluxReactWrapOptions<T extends ActionMap, Contexts extends string = string> {
	/** An existing FluxCore instance to wrap. */
	readonly core: FluxCore<T, Contexts>;
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
		useBindings: createUseBindings(core, useFluxContext),
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
		const { handle, children } = props;

		const contextValue = useMemo(() => {
			return {
				getState: (inputHandle: InputHandle) => core.getState(inputHandle),
				handle,
				subscribe,
			};
		}, [handle]);

		return <FluxContext.Provider value={contextValue}>{children}</FluxContext.Provider>;
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
		const lastValueRef = useRef(value);

		useEffect(() => {
			lastValueRef.current = value;
		});

		useEffect(() => {
			return context.subscribe(() => {
				const updated = selector(context.getState(handle));
				if (lastValueRef.current === updated) {
					return;
				}

				lastValueRef.current = updated;
				setValue(updated);
			});
		}, [context, handle, selector]);

		return value;
	}

	return useAction;
}

function shallowArrayEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
	if (a.size() !== b.size()) {
		return false;
	}

	for (let i = 0; i < a.size(); i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}

	return true;
}

function createUseBindings<T extends ActionMap>(
	core: FluxCore<T>,
	useFluxContext: () => FluxContextValue<T>,
): FluxUseBindings<T> {
	function useBindings(
		action: AllActions<T>,
		platform?: InputPlatform,
	): ReadonlyArray<BindingLike>;
	function useBindings(
		handle: InputHandle,
		action: AllActions<T>,
		platform?: InputPlatform,
	): ReadonlyArray<BindingLike>;
	function useBindings(
		handleOrAction: AllActions<T> | InputHandle,
		actionOrPlatform?: AllActions<T> | InputPlatform,
		maybePlatform?: InputPlatform,
	): ReadonlyArray<BindingLike> {
		const context = useFluxContext();

		let handle: InputHandle;
		let action: AllActions<T>;
		let platform: InputPlatform | undefined;

		if (typeIs(handleOrAction, "string")) {
			handle = context.handle;
			action = handleOrAction;
			platform = actionOrPlatform as InputPlatform | undefined;
		} else {
			handle = handleOrAction as InputHandle;
			action = actionOrPlatform as AllActions<T>;
			platform = maybePlatform;
		}

		const getBindingsValue = (): ReadonlyArray<BindingLike> => {
			const bindings = core.getBindings(handle, action);
			if (platform !== undefined) {
				return getBindingsForPlatform(bindings, platform);
			}

			return bindings;
		};

		const [value, setValue] = useState(getBindingsValue);
		const lastValueRef = useRef(value);

		useEffect(() => {
			lastValueRef.current = value;
		});

		useEffect(() => {
			return context.subscribe(() => {
				const updated = getBindingsValue();
				if (shallowArrayEqual(lastValueRef.current, updated)) {
					return;
				}

				lastValueRef.current = updated;
				setValue(updated);
			});
		}, [context, handle, action, platform]);

		return value;
	}

	return useBindings;
}
