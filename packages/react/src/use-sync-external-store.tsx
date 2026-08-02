import {
	useDebugValue,
	useEffect,
	useLayoutEffect,
	useMemo,
	useReducer,
	useState,
} from "@rbxts/react";

import { batchSync } from "./batch-sync";

/** Registers a store-change listener; returns a disconnect. */
type Subscribe = (onStoreChange: () => void) => () => void;

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

/** One store's listener, shared by every consumer reading from it. */
interface StoreRegistration {
	/** Disconnects the one real subscription. */
	readonly disconnect: () => void;
	/** Change handlers, one per mounted consumer. */
	readonly handlers: Set<() => void>;
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
 * `subscribe` must be referentially stable per store: it is the key consumers
 * are grouped under, so an inline arrow gives every consumer its own group and
 * silently drops the guarantee below.
 *
 * @template T - The snapshot type.
 * @param subscribe - Registers a store-change listener; returns a disconnect.
 *   One stable reference per store.
 * @param getSnapshot - Reads the store's current snapshot.
 * @returns The current snapshot.
 * @throws In dev only, if `getSnapshot` returns a fresh value per call.
 * @remarks
 * Safe under a concurrent root for a mounted consumer, because a store change
 * renders synchronously and React discards whatever pass was in flight. It is
 * not safe for a consumer mounting for the first time while the store moves:
 * that consumer has no earlier snapshot to hold on to, so it commits the new
 * one beside siblings still showing the old, until the layout effect below
 * heals it on the next commit. Closing that window needs the pre-commit
 * consistency check React 18 keeps in the reconciler, which react-lua has no
 * equivalent of.
 * @example
 * ```tsx
 * const platform = useSyncExternalStore(onInputPlatformChanged, getInputPlatform);
 * ```
 */
export function useSyncExternalStore<T>(subscribe: Subscribe, getSnapshot: () => T): T {
	// Read on every render rather than from state, so a re-render for any other
	// reason still picks the store up. Holds because a store change forces a
	// synchronous render that no other pass can interleave with.
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
	// re-render, whose render body reads the store again.
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
		return addStoreHandler(subscribe, () => {
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

/**
 * Live registrations, one per store, keyed by the store's `subscribe`.
 *
 * Module state rather than per-`createFluxReact` state because the identity
 * that has to be shared is the store's, and `useInputPlatform` reads a store
 * that lives at module scope in core with no instance to hang off.
 */
const registrations = new Map<Subscribe, StoreRegistration>();

/**
 * Subscribes to a store once and records the registration its consumers share.
 *
 * Every consumer is notified inside a single {@link batchSync}, so one store
 * change produces one synchronous render carrying all of them. That is what
 * keeps two consumers from committing different snapshots: React throws away
 * any in-progress concurrent render rather than finishing it half on the old
 * value. Subscribing per consumer instead would flush once per consumer, and
 * every flush but the last would commit a partial update.
 *
 * `batchSync` rather than `flushSync` because a store fired from inside a
 * larger batch — every store the update signal drives — must join that batch
 * instead of committing early and splitting it.
 *
 * The flush is not gated on a snapshot actually having moved. Each handler
 * already makes that check, and a batch over handlers that all decline to
 * update costs a priority save/restore and a flush of an empty queue — less
 * than the extra `getSnapshot` per consumer a gate would need to decide.
 *
 * @param subscribe - The store's subscribe function, which identifies it.
 * @returns The new registration, already in {@link registrations}.
 */
function registerStore(subscribe: Subscribe): StoreRegistration {
	const handlers = new Set<() => void>();

	/** Runs every consumer's change check. Hoisted to keep notifying free. */
	const notifyAll = (): void => {
		for (const handler of handlers) {
			handler();
		}
	};

	const registration: StoreRegistration = {
		disconnect: subscribe(() => {
			batchSync(notifyAll);
		}),
		handlers,
	};

	registrations.set(subscribe, registration);
	return registration;
}

/**
 * Adds one consumer's change handler to its store's shared registration,
 * subscribing to the store the first time anybody asks and disconnecting when
 * the last consumer leaves.
 *
 * @param subscribe - The store's subscribe function, which identifies it.
 * @param handler - Called when the store changes.
 * @returns A disconnect for this consumer alone.
 */
function addStoreHandler(subscribe: Subscribe, handler: () => void): () => void {
	const registration = registrations.get(subscribe) ?? registerStore(subscribe);
	registration.handlers.add(handler);

	return () => {
		// Everything comes off the captured registration, so a cleanup that runs
		// after the key was re-registered cannot disconnect the newer one.
		registration.handlers.delete(handler);
		if (registration.handlers.isEmpty()) {
			registration.disconnect();
			if (registrations.get(subscribe) === registration) {
				registrations.delete(subscribe);
			}
		}
	};
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
