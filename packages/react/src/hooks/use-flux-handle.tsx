import type { InputHandle } from "@rbxts/flux";

/**
 * `useFluxHandle` hook type.
 *
 * @template Handle - The handle type; `InputHandle` for `FluxCore`.
 */
export type FluxUseFluxHandle<Handle extends number = InputHandle> = () => Handle;

/**
 * - Builds the `useFluxHandle` hook for a FluxReact instance.
 * - Returns the default handle supplied to the nearest `<FluxProvider>`, typed
 *   by the source (see `FluxSource`). Pair it with `useFluxCore` for
 *   imperative calls on the Provider's consumer.
 *
 * @template Handle - The handle type the source is keyed by.
 * @param useFluxContext - Shared accessor for the Provider context value.
 * @returns A typed `useFluxHandle` hook.
 * @example
 * ```tsx
 * const flux = useFluxCore();
 * const handle = useFluxHandle();
 * return <textbutton Event={{ Activated: () => flux.addContext(handle, "placement") }} />;
 * ```
 */
export function createUseFluxHandle<Handle extends number>(
	useFluxContext: () => { readonly handle: Handle },
): FluxUseFluxHandle<Handle> {
	return (): Handle => useFluxContext().handle;
}
