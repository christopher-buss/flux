import {
	useDebugValue,
	useEffect,
	useLayoutEffect,
	useMemo,
	useReducer,
	useState,
} from "@rbxts/react";

/**
 * Mutable cell the shim threads between render, the layout effect and the
 * subscription handler so a snapshot can be compared without re-rendering.
 *
 * @template T - The snapshot type.
 */
interface StoreInstance<T> {
	/** Reader for the current snapshot, refreshed every commit. */
	getSnapshot: () => T;
	/** Snapshot the last commit rendered. */
	value: T;
}

/**
 * Mutable cell holding the last reference {@link useCachedSnapshot} handed out.
 *
 * @template T - The snapshot type.
 */
interface SnapshotCache<T> {
	/** False until the first read, so `undefined` is a legal snapshot. */
	hasValue: boolean;
	/** The cached reference, valid only while `hasValue` is true. */
	value?: T;
}

/**
 * - Subscribes to an external store and returns its current snapshot.
 * - Ports React's `useSyncExternalStore` shim, which react-lua 17.3.7 does not
 *   ship: the built-in hook only exists in versions that also have concurrent
 *   rendering.
 *
 * `getSnapshot` must be reference-cached — two calls with an unchanged store
 * have to return the same value, or every render reports a change and the
 * component loops. Readers that build a fresh array or object per call need
 * {@link useCachedSnapshot} in front.
 *
 * @template T - The snapshot type.
 * @param subscribe - Registers a store-change listener; returns a disconnect.
 * @param getSnapshot - Reads the store's current snapshot.
 * @returns The current snapshot.
 * @throws In dev only, if `getSnapshot` returns a fresh value per call.
 * @remarks
 * This breaks React's rules and holds only because react-lua renders legacy
 * roots synchronously, so updates are never interleaved. Do not copy the
 * pattern into code that could run under a concurrent renderer.
 * @example
 * ```tsx
 * const platform = useSyncExternalStore(onInputPlatformChanged, getInputPlatform);
 * ```
 */
export function useSyncExternalStore<T>(
	subscribe: (onStoreChange: () => void) => () => void,
	getSnapshot: () => T,
): T {
	// Read on every render rather than from state. Sound only because updates
	// are synchronous, which is the whole premise of the shim.
	const value = getSnapshot();
	if (_G.__DEV__) {
		// Upstream only warns, and latches so it warns once. Throwing is the
		// better trade here: an uncached reader re-renders forever, so the
		// second read is worth paying for in dev to fail on the cause rather
		// than the symptom, and a fatal needs no latch.
		assert(
			value === getSnapshot(),
			"the result of getSnapshot must be cached, or the component re-renders forever",
		);
	}

	// The instance is a mutable cell threaded between render, the layout effect
	// and the subscription handler; it never changes identity, so it lives in a
	// setter-less state slot. The counter beside it exists only to force a
	// re-render, which is sound because updates are synchronous: the render it
	// schedules reads the store again.
	//
	// Upstream stashes the cell in the force-update slot instead, to save an
	// allocation. Two slots is the clearer shape, and the memory it costs is one
	// integer per mounted consumer.
	const [instance] = useState<StoreInstance<T>>(() => ({ getSnapshot, value }));
	const [, forceUpdate] = useReducer(nextTick, 0);

	useLayoutEffect(() => {
		instance.getSnapshot = getSnapshot;
		instance.value = value;

		// An earlier effect in this same commit may already have mutated the
		// store, so the freshly-tracked reader has to be checked once here.
		if (hasSnapshotChanged(instance)) {
			forceUpdate();
		}
	}, [instance, subscribe, getSnapshot, value]);

	useEffect(() => {
		// Catches a change landing between this render and the subscription;
		// everything after is caught by the handler.
		if (hasSnapshotChanged(instance)) {
			forceUpdate();
		}

		// Deliberately not keyed on the snapshot: re-subscribing every time the
		// store moved would tear down the very listener that reported it.
		return subscribe(() => {
			if (hasSnapshotChanged(instance)) {
				forceUpdate();
			}
		});
	}, [instance, subscribe]);

	useDebugValue(value);

	return value;
}

/**
 * - Wraps a reader that builds a fresh value per call in an identity cache.
 * - Returns a stable reader that hands back the previous reference whenever
 *   `isEqual` says the store has not moved, which is what
 *   {@link useSyncExternalStore} requires of `getSnapshot`.
 *
 * The cache lives in a `useState` slot rather than a ref because it is written
 * during render, the same trick the shim itself uses for its instance.
 *
 * @template T - The snapshot type.
 * @param read - Builds the current snapshot; may allocate.
 * @param isEqual - Compares two snapshots for observable equality.
 * @returns A reader stable across renders that caches by reference.
 * @example
 * ```tsx
 * const getSnapshot = useCachedSnapshot(readBindings, shallowArrayEqual);
 * const bindings = useSyncExternalStore(subscribe, getSnapshot);
 * ```
 */
export function useCachedSnapshot<T>(read: () => T, isEqual: (a: T, b: T) => boolean): () => T {
	const [cache] = useState<SnapshotCache<T>>(() => ({ hasValue: false }));

	// Rebuilt whenever `read` changes, so a reader built from new dependencies
	// gets a new identity and the store's layout effect re-checks with it.
	return useMemo(() => {
		return (): T => {
			const updated = read();
			if (cache.hasValue && cache.value !== undefined && isEqual(cache.value, updated)) {
				return cache.value;
			}

			cache.hasValue = true;
			cache.value = updated;
			return updated;
		};
	}, [cache, read, isEqual]);
}

function nextTick(count: number): number {
	return count + 1;
}

function hasSnapshotChanged<T>(instance: StoreInstance<T>): boolean {
	// A reader that throws means the store moved out from under this component,
	// which counts as a change: re-rendering surfaces the error where the
	// component can handle it, rather than leaving a stale snapshot on screen.
	const [didRead, hasChanged] = pcall(() => instance.value !== instance.getSnapshot());
	return didRead ? hasChanged : true;
}
