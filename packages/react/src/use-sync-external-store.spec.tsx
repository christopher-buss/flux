import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React, { useEffect, useLayoutEffect, useState } from "@rbxts/react";

import { makeRenderCounter } from "#test/probes";
import { useCachedSnapshot, useSyncExternalStore } from "./use-sync-external-store";

_G.__DEV__ = true;

/**
 * Minimal external store used to drive the shim, mirroring the
 * `createExternalStore` helper in React's own `useSyncExternalStore` tests: a
 * mutable cell plus a listener set fired synchronously on every write.
 *
 * @template T - The stored snapshot type.
 */
interface ExternalStore<T extends defined> {
	/** Reads the current snapshot. */
	readonly getState: () => T;
	/** Number of live listeners, for asserting subscribe/unsubscribe. */
	readonly getSubscriberCount: () => number;
	/** Writes a new snapshot and notifies every listener. */
	readonly setState: (next: T) => void;
	/** Registers a listener; returns a disconnect. */
	readonly subscribe: (onStoreChange: () => void) => () => void;
}

/** A passive or layout effect hook, injected to pick the commit phase. */
type CommitEffect = typeof useEffect;

/** Props for {@link CommitRaceReader} and its mutating child. */
interface CommitRaceProps {
	/** `useEffect` or `useLayoutEffect`, deciding when the child writes. */
	readonly useCommitEffect: CommitEffect;
}

/**
 * Builds an {@link ExternalStore} backed by a private closure.
 *
 * @template T - The stored snapshot type.
 * @param initial - The starting snapshot.
 * @returns A store whose `subscribe`/`getState` plug straight into the shim.
 */
function createExternalStore<T extends defined>(initial: T): ExternalStore<T> {
	const listeners = new Set<() => void>();
	let state = initial;
	return {
		getState: () => state,
		getSubscriberCount: () => listeners.size(),
		setState: (updated: T) => {
			state = updated;
			for (const listener of listeners) {
				listener();
			}
		},
		subscribe: (onStoreChange: () => void) => {
			listeners.add(onStoreChange);
			return () => {
				listeners.delete(onStoreChange);
			};
		},
	};
}

/**
 * Writes to the store from a descendant effect, once, on mount. As a child its
 * effects run before its parent's, so the parent reader still has the old
 * snapshot tracked when the write lands.
 *
 * @param props - The shared store plus the effect hook selecting the phase.
 * @returns Nothing; the component renders no node of its own.
 */
function CommitRaceMutator({
	store,
	useCommitEffect,
}: CommitRaceProps & { readonly store: ExternalStore<string> }): React.ReactNode {
	const value = useSyncExternalStore(store.subscribe, store.getState);
	useCommitEffect(() => {
		if (value === "initial") {
			store.setState("committed");
		}
	}, [store, value]);
	return undefined;
}

/**
 * Reads the store and renders it, with {@link CommitRaceMutator} as a child so
 * a mid-commit write is only observable through the shim's own re-checks.
 *
 * @param props - The effect hook selecting when the child writes.
 * @returns A label whose text tracks the store's snapshot.
 */
function CommitRaceReader({ useCommitEffect }: CommitRaceProps): React.ReactNode {
	const [store] = useState(() => createExternalStore("initial"));
	const value = useSyncExternalStore(store.subscribe, store.getState);
	return (
		<textlabel Text={`reader:${value}`}>
			<CommitRaceMutator store={store} useCommitEffect={useCommitEffect} />
		</textlabel>
	);
}

describe("useSyncExternalStore", () => {
	it("should return the current snapshot", () => {
		expect.assertions(1);

		afterThis(cleanup);

		const store = createExternalStore("initial");
		function Probe(): React.ReactNode {
			const value = useSyncExternalStore(store.subscribe, store.getState);
			return <textlabel Text={`value:${value}`} />;
		}

		const { queryByText } = render(<Probe />);

		expect(queryByText("value:initial")).toBeDefined();
	});

	it("should re-render when the store changes", () => {
		expect.assertions(1);

		afterThis(cleanup);

		const store = createExternalStore("initial");
		function Probe(): React.ReactNode {
			const value = useSyncExternalStore(store.subscribe, store.getState);
			return <textlabel Text={`value:${value}`} />;
		}

		const { queryByText } = render(<Probe />);
		store.setState("updated");

		expect(queryByText("value:updated")).toBeDefined();
	});

	it("should skip re-rendering when the snapshot is unchanged", () => {
		expect.assertions(1);

		afterThis(cleanup);

		const store = createExternalStore("initial");
		const counter = makeRenderCounter();
		function Probe(): React.ReactNode {
			counter.tick();
			useSyncExternalStore(store.subscribe, store.getState);
			return <frame />;
		}

		render(<Probe />);
		const before = counter.get();
		store.setState("initial");

		expect(counter.get()).toBe(before);
	});

	it("should resubscribe when the store changes identity", () => {
		expect.assertions(3);

		afterThis(cleanup);

		const storeA = createExternalStore("a");
		const storeB = createExternalStore("b");
		function Probe({ store }: { readonly store: ExternalStore<string> }): React.ReactNode {
			const value = useSyncExternalStore(store.subscribe, store.getState);
			return <textlabel Text={`value:${value}`} />;
		}

		const { rerender } = render(<Probe store={storeA} />);
		expect(storeA.getSubscriberCount()).toBe(1);

		rerender(<Probe store={storeB} />);

		expect(storeA.getSubscriberCount()).toBe(0);
		expect(storeB.getSubscriberCount()).toBe(1);
	});

	it("should catch a change committed in a descendant's layout effect", () => {
		expect.assertions(1);

		afterThis(cleanup);

		// The reader's own layout effect runs after its child's, so the child's
		// write lands before the reader re-tracks its snapshot: the shim can
		// only notice via the layout-effect re-check, never the subscription
		// (nothing is subscribed mid-commit yet).
		const { queryByText } = render(<CommitRaceReader useCommitEffect={useLayoutEffect} />);

		expect(queryByText("reader:committed")).toBeDefined();
	});

	it("should catch a change committed in a descendant's passive effect", () => {
		expect.assertions(1);

		afterThis(cleanup);

		// Same shape, but the write happens in a passive effect, after every
		// layout effect. The reader's layout re-check saw the old value, so this
		// time only the passive-effect re-check — the one that runs just before
		// the reader subscribes — can catch it.
		const { queryByText } = render(<CommitRaceReader useCommitEffect={useEffect} />);

		expect(queryByText("reader:committed")).toBeDefined();
	});

	it("should treat a throwing getSnapshot as a change", () => {
		expect.assertions(1);

		afterThis(cleanup);

		// A read that starts working and later throws: the subscription handler's
		// change check swallows the throw and reports a change, forcing the
		// re-render that surfaces the error at the read site rather than leaving
		// a stale snapshot on screen.
		const store = createExternalStore({ throwOnRead: false, value: 0 });
		function Probe(): React.ReactNode {
			const state = useSyncExternalStore(store.subscribe, () => {
				const current = store.getState();
				assert(!current.throwOnRead, "boom in getSnapshot");
				return current;
			});
			return <textlabel Text={`value:${state.value}`} />;
		}

		render(<Probe />);

		expect(() => {
			store.setState({ throwOnRead: true, value: 1 });
		}).toThrow("boom in getSnapshot");
	});

	it("should throw in dev when getSnapshot is not reference-cached", () => {
		expect.assertions(1);

		afterThis(cleanup);

		const store = createExternalStore("initial");
		function Probe(): React.ReactNode {
			// A fresh table per call is never `===` to the last, so the shim's
			// dev guard fires rather than letting the component loop forever.
			const value = useSyncExternalStore(store.subscribe, () => ({ label: "fresh" }));
			return <textlabel Text={`value:${value.label}`} />;
		}

		expect(() => render(<Probe />)).toThrow(
			"the result of getSnapshot must be cached, or the component re-renders forever",
		);
	});
});

describe("useCachedSnapshot", () => {
	it("should hand back the same reference while isEqual holds", () => {
		expect.assertions(1);

		afterThis(cleanup);

		// `read` allocates a fresh array every call; the cache is what keeps the
		// shim from seeing a new reference and re-rendering when content is
		// equal.
		const store = createExternalStore("initial");
		const counter = makeRenderCounter();
		function Probe(): React.ReactNode {
			counter.tick();
			const getSnapshot = useCachedSnapshot(
				() => [store.getState()],
				(a, b) => a[0] === b[0],
			);
			useSyncExternalStore(store.subscribe, getSnapshot);
			return <frame />;
		}

		render(<Probe />);
		const before = counter.get();
		store.setState("initial");

		expect(counter.get()).toBe(before);
	});

	it("should hand back a fresh reference when isEqual reports a change", () => {
		expect.assertions(1);

		afterThis(cleanup);

		const store = createExternalStore("initial");
		function Probe(): React.ReactNode {
			const getSnapshot = useCachedSnapshot(
				() => [store.getState()],
				(a, b) => a[0] === b[0],
			);
			const [value] = useSyncExternalStore(store.subscribe, getSnapshot);
			return <textlabel Text={`value:${value}`} />;
		}

		const { queryByText } = render(<Probe />);
		store.setState("updated");

		expect(queryByText("value:updated")).toBeDefined();
	});
});
