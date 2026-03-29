/**
 * Yields the current coroutine and defers its resumption to the next task
 * cycle. This allows other tasks to execute before the coroutine continues.
 *
 * @example
 *
 * ```typescript
 * signal.Fire(); // Signals run deferred
 * awaitDefer();
 * // Code after this line executes in the next task cycle
 * ```
 */
export function awaitDefer(): void {
	const running = coroutine.running();
	task.defer(() => {
		coroutine.resume(running);
	});
	coroutine.yield();
}
