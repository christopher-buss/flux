import type { ActionState } from "@rbxts/flux";
import React from "@rbxts/react";

import type { FluxReact } from "../src/create-flux-react";
import type { TEST_ACTIONS } from "./fixtures";

/** ActionState bound to the integration fixture's action map. */
export type FluxActionState = ActionState<typeof TEST_ACTIONS>;

/** Typed `useAction` hook bound to the integration fixture's action map. */
export type UseFluxAction = FluxReact<typeof TEST_ACTIONS>["useAction"];

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

/** Props for {@link createLabeledJumpProbe} components. */
export interface LabeledProbeProps {
	/** Label embedded in the rendered Text so RTL queries can match it. */
	readonly label: string;
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
): (props: LabeledProbeProps) => React.ReactNode {
	return (props: LabeledProbeProps): React.ReactNode => {
		const isJumping = useAction((state) => state.pressed("jump"));
		return <textlabel Text={`${props.label}:${tostring(isJumping)}`} />;
	};
}
