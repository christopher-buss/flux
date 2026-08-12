// Typings for react-lua's mock scheduler.
//
// The `@rbxts-js/scheduler` module swaps itself for `unstable_mock` when
// `ReactGlobals.__ROACT_17_MOCK_SCHEDULER__` is set, which
// `loaders/react-setup.luau` does in `setupFiles`. Requiring this shim
// therefore hands back the very module instance the reconciler schedules
// against. Every function here throws outside that mocked environment.
//
// Only the yield-log helpers and enough of the scheduling surface to queue one
// callback are declared — what a test needs to interrupt a concurrent render
// partway through, inspect what rendered before the work loop bailed, and check
// that scheduled work was drained. Add the rest when something wants them.

/**
 * Records a value in the yield log from inside a render body.
 *
 * @param value - The value to record.
 * @example
 * ```tsx
 * function Reader(): React.ReactNode {
 * 	const value = useSyncExternalStore(store.subscribe, store.getState);
 * 	unstable_yieldValue(`A${value}`);
 * 	return <textlabel Text={`A${value}`} />;
 * }
 * ```
 */
export declare function unstable_yieldValue(value: unknown): void;

/**
 * Runs scheduled work until the yield log holds `count` values, then stops the
 * work loop mid-pass. Leaves any unfinished render in progress.
 *
 * @param count - How many yields to allow before bailing out.
 * @example
 * ```tsx
 * root.render(<App />);
 * unstable_flushNumberOfYields(2);
 * expect(unstable_clearYields()).toEqual(["A0", "B0"]);
 * ```
 */
export declare function unstable_flushNumberOfYields(count: number): void;

/**
 * Drains the yield log.
 *
 * @returns Everything recorded since the last drain, in order.
 */
export declare function unstable_clearYields(): Array<unknown>;

/** The priority ordinary work is scheduled at. */
export declare const unstable_NormalPriority: number;

/**
 * Queues `callback` on the scheduler the reconciler shares, so a test can ask
 * whether something drained the queue.
 *
 * @param priorityLevel - One of the scheduler's priority ordinals.
 * @param callback - Runs when the queue is drained.
 * @example
 * ```tsx
 * unstable_scheduleCallback(unstable_NormalPriority, () => {
 * 	setStatus("drained");
 * });
 * ```
 */
export declare function unstable_scheduleCallback(
	priorityLevel: number,
	callback: () => void,
): void;
