import type {
	ActionMap,
	ActionState,
	ActionValue,
	AllActions,
	BindingLike,
	InputPlatform,
} from "@rbxts/flux";

/**
 * The read surface Flux hooks need from whatever the Provider supplies.
 *
 * `FluxCore` satisfies it with `InputHandle`; an integration layer satisfies
 * it with its own handle type, so hooks and the Provider speak that type and
 * no consumer casts it to `InputHandle`. `FluxJecs` satisfies it with
 * `Entity`.
 *
 * @remarks
 * Handles must be numbers at runtime. Hooks tell a leading handle from a
 * leading context, action, or selector by its runtime type.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @template Handle - The handle type every read is keyed by.
 */
export interface FluxSource<T extends ActionMap, Contexts extends string, Handle> {
	/**
	 * Returns the effective bindings for a single action.
	 *
	 * @param handle - The handle to query.
	 * @param action - The action name to query.
	 * @returns The effective bindings for the action.
	 */
	getBindings(handle: Handle, action: AllActions<T>): ReadonlyArray<BindingLike>;

	/**
	 * Returns the effective bindings for a single action on one platform.
	 *
	 * @param handle - The handle to query.
	 * @param action - The action name to query.
	 * @param platform - The platform to read.
	 * @returns That platform's effective bindings.
	 */
	getBindingsForPlatform(
		handle: Handle,
		action: AllActions<T>,
		platform: InputPlatform,
	): ReadonlyArray<BindingLike>;

	/**
	 * Returns static config plus active state for a context.
	 *
	 * @param handle - The handle to query.
	 * @param context - The context name to query.
	 * @returns Context info record.
	 */
	getContextInfo(
		handle: Handle,
		context: Contexts,
	): {
		readonly actions: ReadonlyArray<AllActions<T>>;
		readonly active: boolean;
		readonly priority: number;
		readonly sink: boolean;
	};

	/**
	 * Returns the value an inert read of the action reports.
	 *
	 * @template A - The action name.
	 * @param action - The action to resolve.
	 * @returns The action type's neutral value.
	 */
	getNeutralValue<A extends AllActions<T>>(action: A): ActionValue<T, A>;

	/**
	 * Returns the action state for the given handle.
	 *
	 * @param handle - The handle to query.
	 * @returns The typed action state.
	 */
	getState(handle: Handle): ActionState<T>;

	/**
	 * Checks whether a context is active for the given handle.
	 *
	 * @param handle - The handle to check.
	 * @param context - The context name to check.
	 * @returns True if the context is active.
	 */
	hasContext(handle: Handle, context: Contexts): boolean;
}

/**
 * Any `FluxSource` over the given actions and contexts, whatever its handle.
 *
 * @remarks
 * Every concrete handle type satisfies the `unknown` bound because methods
 * check parameters in both directions. `FluxSourceHandle` recovers the real
 * one.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
export type AnyFluxSource<T extends ActionMap, Contexts extends string> = FluxSource<
	T,
	Contexts,
	unknown
>;

/**
 * The handle type a `FluxSource` is keyed by.
 *
 * @template Source - The source to read the handle type from.
 */
export type FluxSourceHandle<Source> = Source extends {
	getState(handle: infer Handle extends number): unknown;
}
	? Handle
	: never;
