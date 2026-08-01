import {
	unstable_clearYields,
	unstable_flushNumberOfYields,
	unstable_yieldValue,
} from "@flux/test-utils/scheduler";
import { describe, expect, it } from "@rbxts/jest-globals";
import React, { useLayoutEffect, useState } from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";

import type { ExternalStore, Log } from "#test/probes";
import { createExternalStore, makeLog, mountConcurrent } from "#test/probes";
import { useSyncExternalStore } from "./use-sync-external-store";

_G.__DEV__ = true;

/** Identifies one of the three sibling readers. */
type Label = "A" | "B" | "C";

/** What each reader committed, for the commit being assembled. */
type Committed = Partial<Record<Label, number>>;

/** Props for the three sibling readers sharing one store. */
interface ReaderProps {
	/** Filled in by each reader's own layout effect, before the parent's. */
	readonly committed: Committed;
	/** Distinguishes each sibling in the yield log. */
	readonly label: Label;
	/** The store every sibling reads. */
	readonly store: ExternalStore<number>;
}

/**
 * Reads the store and records the snapshot it committed. The yield marks where
 * the work loop may stop, so a test can interrupt the render between two
 * siblings.
 *
 * @param props - The shared store, this sibling's label, and the commit record.
 * @returns A label rendering the snapshot.
 */
function Reader({ committed, label, store }: ReaderProps): React.ReactNode {
	const value = useSyncExternalStore(store.subscribe, store.getState);
	unstable_yieldValue(`${label}${value}`);

	useLayoutEffect(() => {
		committed[label] = value;
	});

	return <textlabel Text={`${label}${value}`} />;
}

/**
 * Three siblings reading one store, with a layout effect recording what the
 * three of them committed together. A child's layout effects run before its
 * parent's, so the record is complete by the time it is read.
 *
 * @param props - The store and the log the layout effect writes to.
 * @returns The three readers.
 */
function App({
	log,
	store,
}: {
	readonly log: Log<string>;
	readonly store: ExternalStore<number>;
}): React.ReactNode {
	const [committed] = useState<Committed>(() => ({}));

	useLayoutEffect(() => {
		log.push(`${committed.A}${committed.B}${committed.C}`);
	});

	return (
		<frame>
			<Reader key="a" committed={committed} label="A" store={store} />
			<Reader key="b" committed={committed} label="B" store={store} />
			<Reader key="c" committed={committed} label="C" store={store} />
		</frame>
	);
}

describe("useSyncExternalStore under a concurrent root", () => {
	it("should never commit a snapshot one reader disagrees with", () => {
		expect.assertions(2);

		// Ported from React's `detects interleaved mutations during a concurrent
		// read before layout effects fire`. Upstream needs `startTransition` to
		// get a render the work loop can pause; React 17 does not, because a
		// ConcurrentRoot already renders at default lane through
		// `workLoopConcurrent`.
		//
		// The readers are mounted and subscribed first, so the mutation reaches
		// them. That is the case a userland shim can close: a store update that
		// renders at sync lane discards the in-progress pass. A store moving
		// while a reader is mounting for the first time cannot be closed, since
		// that reader has no earlier snapshot to hold on to.
		const store = createExternalStore(0);
		const log = makeLog<string>();
		const root = mountConcurrent(<App log={log} store={store} />);
		unstable_clearYields();

		// A render pass the store did not cause, which the mutation below lands
		// in the middle of. Rendering the same element type again is enough:
		// fresh props mean React cannot take the bailout, so all three readers
		// re-render.
		root.render(<App log={log} store={store} />);

		// Stop the work loop after two siblings have rendered. Asserting the log
		// proves the render really was interrupted; without it the test could
		// pass for the wrong reason.
		unstable_flushNumberOfYields(2);
		expect(unstable_clearYields()).toEqual(["A0", "B0"]);

		store.setState(1);

		ReactRoblox.act(() => {});

		// "000" and "111" are both consistent commits. "001" is the tear.
		const torn = log.entries().filter((commit) => commit !== "000" && commit !== "111");
		expect(torn).toEqual([]);
	});
});
