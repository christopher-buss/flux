import type { Error } from "./stub";

/** Options for the `waitFor` async utility. */
export interface WaitForOptions {
	/** The container element to observe for mutations. */
	container?: Instance;
	/** Interval in milliseconds between callback retries. */
	interval?: number;
	/** Options forwarded to the internal mutation observer. */
	mutationObserverOptions?: MutationObserverInit;
	/**
	 * Custom handler called when the wait times out.
	 *
	 * @param error - The timeout error.
	 */
	onTimeout?: (error: Error) => Error;
	/** Maximum time in milliseconds to wait before timing out. */
	timeout?: number;
}

type MutationObserverInit = object;

/**
 * Retry a callback until it stops throwing, then return its result.
 *
 * @template T - The type returned by the callback.
 * @param callback - The assertion or query to retry.
 * @param options - Timeout, interval, and observer options.
 * @returns A promise resolving to the callback's return value.
 */
export function waitFor<T>(callback: () => Promise<T> | T, options?: WaitForOptions): Promise<T>;
