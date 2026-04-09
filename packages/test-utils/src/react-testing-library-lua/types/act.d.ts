export interface Thenable<T> {
	andThen<TResult1 = T, TResult2 = never>(
		onFulfill?: (value: TResult1) => Thenable<TResult1> | TResult1 | undefined,
		onReject?: (error: unknown) => Thenable<TResult2> | TResult2 | undefined,
	): Thenable<TResult1 | TResult2>;
}

export default function act<T>(callback: () => T | Thenable<T>): Thenable<T>;
