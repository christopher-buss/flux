import type { ActionMap, FluxCore, InputPlatform } from "@rbxts/flux";
import type React from "@rbxts/react";
import { createContext } from "@rbxts/react";

import type { FluxContextValue } from "./flux-context";
import { createUseFluxContext } from "./flux-context";
import type { FluxProviderProps } from "./flux-provider";
import { createFluxProvider } from "./flux-provider";
import type { AnyFluxSource, FluxSourceHandle } from "./flux-source";
import type { FluxUseAction } from "./hooks/use-action";
import { createUseAction } from "./hooks/use-action";
import type { FluxUseBindings } from "./hooks/use-bindings";
import { createUseBindings } from "./hooks/use-bindings";
import type { FluxUseCapture, FluxUseCaptureAction } from "./hooks/use-capture";
import { createUseCapture, createUseCaptureAction } from "./hooks/use-capture";
import type { FluxUseFluxCore } from "./hooks/use-flux-core";
import { createUseFluxCore } from "./hooks/use-flux-core";
import type { FluxUseFluxHandle } from "./hooks/use-flux-handle";
import { createUseFluxHandle } from "./hooks/use-flux-handle";
import type { FluxUseActiveContext, FluxUseInputContext } from "./hooks/use-input-context";
import { createUseActiveContext, createUseInputContext } from "./hooks/use-input-context";
import { useInputPlatform } from "./hooks/use-input-platform";
import { createUpdateSignal } from "./update-signal";

/**
 * The return type of {@link createFluxReact}.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @template Source - The source the Provider takes; `FluxCore` by default.
 */
export interface FluxReact<
	T extends ActionMap,
	Contexts extends string = string,
	Source extends AnyFluxSource<T, Contexts> = FluxCore<T, Contexts>,
> {
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
	 * input state for the supplied source and handle.
	 */
	readonly FluxProvider: (props: FluxProviderProps<T, Contexts, Source>) => React.ReactNode;

	/**
	 * Hook that subscribes to ActionState changes via a selector. Re-renders
	 * only when the selected value changes.
	 */
	readonly useAction: FluxUseAction<T, FluxSourceHandle<Source>>;

	/**
	 * Hook that subscribes to a context's active state for a handle.
	 * Re-renders only when the boolean flips.
	 */
	readonly useActiveContext: FluxUseActiveContext<Contexts, FluxSourceHandle<Source>>;

	/**
	 * Hook that subscribes to binding changes for an action. Re-renders only
	 * when the bindings array changes.
	 */
	readonly useBindings: FluxUseBindings<T, FluxSourceHandle<Source>>;

	/**
	 * Hook that captures an action for as long as the component is mounted,
	 * releasing it on unmount.
	 *
	 * Returns the same token object for the component's lifetime. The token
	 * reads inert until the capture lands and after it is released, so call
	 * sites never branch on ownership — except `canceled()`, which keeps
	 * delegating after release so the one-frame boundary cancel still lands
	 * during teardown.
	 */
	readonly useCapture: FluxUseCapture<T, FluxSourceHandle<Source>>;

	/**
	 * Hook that reads through a capture token via a selector. Re-renders only
	 * when the selected value changes.
	 */
	readonly useCaptureAction: FluxUseCaptureAction;

	/**
	 * Hook that returns the source supplied to the nearest `FluxProvider`:
	 * the `FluxCore`, or the integration wrapper the factory was typed with.
	 *
	 * Use this for imperative calls like `core.addContext(handle, "menu")` or
	 * `core.rebind(...)` from inside a component, without having to pass
	 * `core` down as a prop.
	 */
	readonly useFluxCore: FluxUseFluxCore<T, Contexts, Source>;

	/**
	 * Hook that returns the default handle supplied to the nearest
	 * `FluxProvider`, typed by the source.
	 */
	readonly useFluxHandle: FluxUseFluxHandle<FluxSourceHandle<Source>>;

	/**
	 * Hook that subscribes to a context's info for a handle.
	 *
	 * Returns static config (priority, sink, declared actions) combined with
	 * live `isActive` state. Re-renders only when `isActive` flips; static
	 * fields are memoized per context name.
	 */
	readonly useInputContext: FluxUseInputContext<T, Contexts, FluxSourceHandle<Source>>;

	/**
	 * Hook that subscribes to the platform the player is currently using.
	 * Re-renders only when it changes.
	 *
	 * Pass it to `useBindings` to read the bindings for whatever the player is
	 * holding right now.
	 */
	readonly useInputPlatform: () => InputPlatform;
}

/**
 * - Creates a FluxReact instance for React integration.
 * - Returns a flush function, a Provider component, and typed hooks. Core is
 *   supplied at render time via `<FluxProvider core={...} handle={...}>` so
 *   the factory can live in a shared module without owning a world or core.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @template Source - The source the Provider takes. Defaults to `FluxCore`;
 * pass an integration wrapper such as `FluxJecs` so the Provider, hooks, and
 * `useFluxHandle` speak its handle type (`Entity`) with no cast to
 * `InputHandle`.
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
 * @example
 * ```tsx
 * // jecs: the Provider takes the FluxJecs wrapper and an entity
 * export const { FluxProvider, useFluxCore, useFluxHandle } = createFluxReact<
 *   typeof actions,
 *   keyof typeof contexts & string,
 *   FluxJecs<typeof actions, typeof contexts>
 * >();
 *
 * root.render(
 *   <FluxProvider core={fluxJecs} handle={playerEntity}>
 *     <App />
 *   </FluxProvider>,
 * );
 *
 * // in a component: wrapper methods keep jecs context tags in sync
 * const flux = useFluxCore();
 * flux.addContext(useFluxHandle(), "placement");
 * ```
 */
export function createFluxReact<
	T extends ActionMap,
	Contexts extends string = string,
	Source extends AnyFluxSource<T, Contexts> = FluxCore<T, Contexts>,
>(): FluxReact<T, Contexts, Source> {
	type Handle = FluxSourceHandle<Source>;

	const signal = createUpdateSignal();

	const FluxContext = createContext<FluxContextValue<T, Contexts, Handle, Source> | undefined>(
		undefined,
	);
	FluxContext.displayName = "FluxContext";

	const useFluxContext = createUseFluxContext(FluxContext);
	// Hooks only read through the `FluxSource` surface; widening once lets
	// every factory infer its type arguments.
	const useHookContext: () => FluxContextValue<T, Contexts, Handle> = useFluxContext;

	return {
		flush: signal.fire,
		FluxProvider: createFluxProvider(FluxContext, signal.subscribe, signal.getVersion),
		useAction: createUseAction(useHookContext),
		useActiveContext: createUseActiveContext(useHookContext),
		useBindings: createUseBindings(useHookContext),
		useCapture: createUseCapture(useHookContext),
		useCaptureAction: createUseCaptureAction(useFluxContext),
		useFluxCore: createUseFluxCore(useFluxContext),
		useFluxHandle: createUseFluxHandle(useFluxContext),
		useInputContext: createUseInputContext(useHookContext),
		useInputPlatform,
	};
}
