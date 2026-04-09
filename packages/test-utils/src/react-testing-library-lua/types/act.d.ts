/**
 * Promise-like type for Luau that supports chaining with `andThen`.
 *
 * @template T - The resolved value type.
 */
export interface Thenable<T> {
	/**
	 * Attach callbacks for resolution or rejection.
	 *
	 * @template TResult1 - The type returned by the fulfillment handler.
	 * @template TResult2 - The type returned by the rejection handler.
	 * @param onFulfill - Called when the thenable resolves.
	 * @param onReject - Called when the thenable rejects.
	 * @returns A new thenable for the handler's return value.
	 */
	andThen<TResult1 = T, TResult2 = never>(
		onFulfill?: (value: TResult1) => Thenable<TResult1> | TResult1 | undefined,
		onReject?: (error: unknown) => Thenable<TResult2> | TResult2 | undefined,
	): Thenable<TResult1 | TResult2>;
}

/**
 * Wrap code that causes React state updates so they are batched and flushed
 * synchronously.
 *
 * @template T - The return type of the callback.
 * @param callback - The code to execute within the act boundary.
 * @returns A thenable that resolves when the act boundary completes.
 */
export default function act<T>(callback: () => T | Thenable<T>): Thenable<T>;
