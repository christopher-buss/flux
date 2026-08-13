import { getInputPlatform, setInputPlatformOverride } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

import * as NativeStack from "#test/native-stack";
import type { ExternalStore } from "#test/probes";
import { createExternalStore } from "#test/probes";
import {
	selectStoreHook,
	useSyncExternalStore,
	useSyncExternalStoreShim,
} from "./use-sync-external-store";

/**
 * Builds a probe that reads `store` through the natively-mounted copy of the
 * store hook — React's own, not the shim — and renders the snapshot.
 *
 * Elements are built with `createElement` rather than JSX because JSX would
 * emit the stock React in scope, and a component may not mix the two stacks.
 *
 * @param store - The store to read.
 * @returns A component rendering `value:<snapshot>`.
 */
function createNativeProbe(store: ExternalStore<string>): () => React.ReactNode {
	return () => {
		const value = NativeStack.StoreHook.useSyncExternalStore(store.subscribe, store.getState);
		return NativeStack.React.createElement("TextLabel", { Text: `value:${value}` });
	};
}

/**
 * Mounts `element` on a concurrent root built by the **patched** renderer and
 * unmounts it when the test ends.
 *
 * @param element - A tree built with the native React's `createElement`.
 * @returns The container, for reading what committed.
 */
function renderNative(element: React.ReactElement): Instance {
	const container = new Instance("Folder");
	const root = NativeStack.ReactRoblox.createRoot(container);

	afterThis(() => {
		NativeStack.ReactRoblox.act(() => {
			root.unmount();
		});
	});

	NativeStack.ReactRoblox.act(() => {
		root.render(element);
	});

	return container;
}

/**
 * Reads the text the probe last committed.
 *
 * @param container - The container {@link renderNative} rendered into.
 * @returns The label's text, or undefined if nothing committed.
 */
function committedText(container: Instance): string | undefined {
	return container.FindFirstChildWhichIsA("TextLabel")?.Text;
}

describe("the native store hook", () => {
	it("should be selected only by the copy mounted beside the patched React", () => {
		expect.assertions(2);

		// One module, compiled once, mounted twice. Beside the stock React it
		// resolves to the shim; beside the patched one it resolves to React's
		// own hook. That is the branch a unit spec can only fake.
		expect(useSyncExternalStore).toBe(useSyncExternalStoreShim);
		expect(NativeStack.StoreHook.useSyncExternalStore).toBe(
			NativeStack.React.useSyncExternalStore,
		);
	});

	it("should be absent from the React every other spec renders against", () => {
		expect.assertions(2);

		expect(selectStoreHook(React)).toBe(useSyncExternalStoreShim);
		expect(selectStoreHook(NativeStack.React)).toBe(NativeStack.React.useSyncExternalStore);
	});

	it("should render and update a store", () => {
		expect.assertions(2);

		const store = createExternalStore("initial");
		const container = renderNative(NativeStack.React.createElement(createNativeProbe(store)));
		expect(committedText(container)).toBe("value:initial");

		NativeStack.ReactRoblox.act(() => {
			store.setState("updated");
		});

		expect(committedText(container)).toBe("value:updated");
	});

	it("should defer a store change rather than commit it inside the listener", () => {
		expect.assertions(2);

		// The timing ADR 0007 records, asserted rather than described: the shim
		// notifies inside `batchSync` and commits before `setState` returns,
		// React's hook schedules sync-lane work the reconciler drains once the
		// stack unwinds.
		const store = createExternalStore("initial");
		const container = renderNative(NativeStack.React.createElement(createNativeProbe(store)));

		store.setState("updated");
		expect(committedText(container)).toBe("value:initial");

		NativeStack.ReactRoblox.act(() => {});
		expect(committedText(container)).toBe("value:updated");
	});

	it("should read core's platform store through a Flux hook", () => {
		expect.assertions(1);

		// `useInputPlatform` end to end on the patched stack, reading the same
		// core module the stock leg drives: `@rbxts/flux` is deliberately left
		// out of the native mount, so the walk up finds the one global copy.
		afterThis(() => {
			setInputPlatformOverride(undefined);
		});
		setInputPlatformOverride("gamepad");

		function Probe(): React.ReactNode {
			return NativeStack.React.createElement("TextLabel", {
				Text: `value:${NativeStack.FluxReact.useInputPlatform()}`,
			});
		}

		const container = renderNative(NativeStack.React.createElement(Probe));

		expect(committedText(container)).toBe(`value:${getInputPlatform()}`);
	});
});
