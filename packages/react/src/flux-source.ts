import type {
	ActionMap,
	ActionState,
	AllActions,
	BindingLike,
	FluxCore,
	InputPlatform,
} from "@rbxts/flux";

/**
 * The read surface Flux hooks need from whatever the Provider supplies.
 *
 * `FluxCore` satisfies it with `InputHandle`; an integration layer satisfies
 * it with its own handle type, so hooks and the Provider speak that type and
 * no consumer casts it to `InputHandle`. `FluxJecs` satisfies it with
 * `Entity`. Each method mirrors the `FluxCore` method of the same name.
 *
 * @remarks
 * Handles must be numbers at runtime. Hooks tell a leading handle from a
 * leading context, action, or selector by its runtime type.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @template Handle - The handle type every read is keyed by.
 */
export interface FluxSource<T extends ActionMap, Contexts extends string, Handle extends number> {
	/** @see FluxCore.getBindings */
	getBindings(handle: Handle, action: AllActions<T>): ReadonlyArray<BindingLike>;

	/** @see FluxCore.getBindingsForPlatform */
	getBindingsForPlatform(
		handle: Handle,
		action: AllActions<T>,
		platform: InputPlatform,
	): ReadonlyArray<BindingLike>;

	/** @see FluxCore.getContextInfo */
	getContextInfo(
		handle: Handle,
		context: Contexts,
	): ReturnType<FluxCore<T, Contexts>["getContextInfo"]>;

	/** @see FluxCore.getNeutralValue */
	readonly getNeutralValue: FluxCore<T, Contexts>["getNeutralValue"];

	/** @see FluxCore.getState */
	getState(handle: Handle): ActionState<T>;

	/** @see FluxCore.hasContext */
	hasContext(handle: Handle, context: Contexts): boolean;
}

/**
 * Any `FluxSource` over the given actions and contexts, whatever its handle.
 *
 * @remarks
 * Every concrete handle type satisfies the `number` bound because methods
 * check parameters in both directions. `FluxSourceHandle` recovers the real
 * one.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
export type AnyFluxSource<T extends ActionMap, Contexts extends string> = FluxSource<
	T,
	Contexts,
	number
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
