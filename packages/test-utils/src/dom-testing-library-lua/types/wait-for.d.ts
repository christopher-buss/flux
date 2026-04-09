import type { Error } from "./stub";

type MutationObserverInit = object;

export interface WaitForOptions {
	container?: Instance;
	interval?: number;
	mutationObserverOptions?: MutationObserverInit;
	onTimeout?: (error: Error) => Error;
	timeout?: number;
}

export function waitFor<T>(callback: () => Promise<T> | T, options?: WaitForOptions): Promise<T>;
