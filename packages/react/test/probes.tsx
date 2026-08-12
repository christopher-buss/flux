import type { ActionState } from "@rbxts/flux";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";

import type { FluxReact } from "#src/create-flux-react";
import type { TEST_ACTIONS } from "./fixtures";

/** ActionState bound to the integration fixture's action map. */
export type FluxActionState = ActionState<typeof TEST_ACTIONS>;

/** Typed `useAction` hook bound to the integration fixture's action map. */
export type UseFluxAction = FluxReact<typeof TEST_ACTIONS>["useAction"];

/**
 * Closure-private, ordered record of values observed from inside a component.
 *
 * @template T - The recorded value type.
 */
export interface Log<T extends defined> {
	/** Returns everything recorded so far, in order. */
	readonly entries: () => Array<T>;
	/** Records one value. */
	readonly push: (value: T) => void;
}

/**
 * Minimal external store for driving `useSyncExternalStore`, mirroring the
 * `createExternalStore` helper in React's own tests: a mutable cell plus a
 * listener set fired synchronously on every write.
 *
 * @template T - The stored snapshot type.
 */
export interface ExternalStore<T extends defined> {
	/** Reads the current snapshot. */
	readonly getState: () => T;
	/** Number of live listeners, for asserting subscribe/unsubscribe. */
	readonly getSubscriberCount: () => number;
	/** Writes a new snapshot and notifies every listener. */
	readonly setState: (next: T) => void;
	/** Registers a listener; returns a disconnect. */
	readonly subscribe: (onStoreChange: () => void) => () => void;
}

/** Closure-private counter with `tick`/`get` accessors. */
export interface RenderCounter {
	/** Returns the current count. */
	readonly get: () => number;
	/** Increments the counter by one. */
	readonly tick: () => void;
}

/** Probe component tracking its own render count. */
export interface CountingProbe {
	/** The probe component to mount. */
	readonly component: () => React.ReactNode;
	/** Returns the number of times the probe has rendered. */
	readonly getRenderCount: () => number;
}

/** A concurrent root mounted for the duration of one test. */
export interface ConcurrentRoot {
	/**
	 * Renders again outside `act`, so the work loop can be stopped part-way.
	 */
	readonly render: (element: React.ReactElement) => void;
}

/** Props for {@link createLabeledJumpProbe} components. */
export interface LabeledProbeProps {
	/** Label embedded in the rendered Text so RTL queries can match it. */
	readonly label: string;
}

/**
 * Builds a {@link Log} backed by a private closure, so components record into
 * it without reassigning a component-external variable.
 *
 * @template T - The recorded value type.
 * @returns A new empty log.
 */
export function makeLog<T extends defined>(): Log<T> {
	const entries = new Array<T>();
	return {
		entries: () => entries,
		push: (value: T) => {
			entries.push(value);
		},
	};
}

/**
 * Builds an {@link ExternalStore} backed by a private closure.
 *
 * @template T - The stored snapshot type.
 * @param initial - The starting snapshot.
 * @returns A store whose `subscribe`/`getState` plug straight into the shim.
 */
export function createExternalStore<T extends defined>(initial: T): ExternalStore<T> {
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
 * - Mounts `element` on a concurrent root and unmounts it when the test ends.
 * - RTL renders on a concurrent root too, but wraps every render in `act`,
 *   which drains the work loop before returning. A test that has to stop the
 *   loop part-way needs a root it can render on outside `act`.
 *
 * @param element - The tree to mount.
 * @returns A handle for re-rendering the same root.
 * @example
 * ```tsx
 * const root = mountConcurrent(<App store={store} />);
 * root.render(<App store={store} />);
 * unstable_flushNumberOfYields(2);
 * ```
 */
export function mountConcurrent(element: React.ReactElement): ConcurrentRoot {
	const root = ReactRoblox.createRoot(new Instance("Folder"));

	afterThis(() => {
		ReactRoblox.act(() => {
			root.unmount();
		});
	});

	ReactRoblox.act(() => {
		root.render(element);
	});

	return {
		render: (updated: React.ReactElement) => {
			root.render(updated);
		},
	};
}

/**
 * Builds a {@link RenderCounter} backed by a private closure. Components call
 * `tick()` from inside their render body, which avoids the "reassigning
 * outside variables" React lint rule that bans direct mutation of
 * component-external state.
 *
 * @returns A new render counter starting at 0.
 */
export function makeRenderCounter(): RenderCounter {
	let count = 0;
	return {
		get: () => count,
		tick: () => {
			count += 1;
		},
	};
}

/**
 * Builds a probe component that runs `useAction(selector)` on every render
 * and tracks how many times it has rendered. Used to assert re-render
 * behavior under flushes and selector updates.
 *
 * @param useAction - The `useAction` hook from a specific FluxReact instance.
 * @param selector - A selector passed through to `useAction`.
 * @returns The probe component and a `getRenderCount` accessor.
 */
export function createCountingProbe(
	useAction: UseFluxAction,
	selector: (state: FluxActionState) => unknown,
): CountingProbe {
	const counter = makeRenderCounter();

	function Probe(): React.ReactNode {
		counter.tick();
		useAction(selector);
		return <frame />;
	}

	return {
		component: Probe,
		getRenderCount: counter.get,
	};
}

/**
 * Builds a probe component that reads `pressed("jump")` and renders its
 * value as `"<label>:<value>"` so each probe is distinguishable via RTL text
 * queries.
 *
 * @param useAction - The `useAction` hook from a specific FluxReact instance.
 * @returns A component that renders `<textlabel>${label}:${value}</textlabel>`.
 */
export function createLabeledJumpProbe(
	useAction: UseFluxAction,
): React.FunctionComponent<LabeledProbeProps> {
	return (props: LabeledProbeProps): React.ReactNode => {
		const isJumping = useAction((state) => state.pressed("jump"));
		return <textlabel Text={`${props.label}:${tostring(isJumping)}`} />;
	};
}
