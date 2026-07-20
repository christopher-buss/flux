import type { ActionMap, AllActions, CaptureToken, FluxCore, InputHandle } from "@rbxts/flux";
import { useEffect, useRef, useState } from "@rbxts/react";

import type { FluxContextValue } from "../flux-context";

/**
 * Overloaded `useCapture` hook type.
 *
 * @template T - The action map type.
 */
export interface FluxUseCapture<T extends ActionMap> {
	/**
	 * Captures an action for as long as the component is mounted.
	 *
	 * @template A - The captured action name, narrowing the token's reads.
	 * @param action - The action to capture.
	 * @returns A stable token, inert until the capture lands.
	 */
	<A extends AllActions<T>>(action: A): CaptureToken<T, A>;

	/**
	 * Captures an action for the component's lifetime, on an explicit handle.
	 *
	 * @template A - The captured action name, narrowing the token's reads.
	 * @param handle - The InputHandle to capture on (overrides Provider default).
	 * @param action - The action to capture.
	 * @returns A stable token, inert until the capture lands.
	 */
	<A extends AllActions<T>>(handle: InputHandle, action: A): CaptureToken<T, A>;
}

/**
 * The reads every capture token carries regardless of the action's kind.
 *
 * Used to constrain `useCaptureAction` to real tokens while letting the
 * token's kind-narrowed reads flow through the selector untouched.
 */
export interface CaptureTokenLike {
	/** Whether the captured action was canceled this frame. */
	canceled(): boolean;
	/** Marks the captured action as consumed for the rest of the frame. */
	claim(): boolean;
	/** How long the current trigger state has been active, in seconds. */
	currentDuration(): number;
	/** Whether the captured action's trigger is ongoing. */
	ongoing(): boolean;
	/** How long the previous trigger state lasted, in seconds. */
	previousDuration(): number;
	/** Releases the capture. */
	release(): void;
	/** Whether the captured action's trigger conditions were met this frame. */
	triggered(): boolean;
}

/**
 * The `useCaptureAction` hook type: reads through a capture token and
 * re-renders when the selected value changes.
 *
 * @template Token - The capture token type, narrowed to its action's kind.
 * @template R - The selected value type.
 * @param token - The token returned by `useCapture`.
 * @param selector - Function that extracts a value from the token.
 * @returns The selected value.
 */
export type FluxUseCaptureAction = <Token extends CaptureTokenLike, R>(
	token: Token,
	selector: (token: Token) => R,
) => R;

/** Any value an action can hold. */
type CaptureValue = boolean | number | Vector2 | Vector3;

/**
 * The full runtime shape of a capture token — every processed read with the
 * action pre-bound. The public `CaptureToken` type narrows this to the
 * action's kind; the facade implements all of it and is cast on the way out.
 */
interface CaptureTokenSurface {
	axis1d(): number;
	axis3d(): Vector3;
	axisBecameActive(): boolean;
	axisBecameInactive(): boolean;
	canceled(): boolean;
	claim(): boolean;
	currentDuration(): number;
	direction2d(): Vector2;
	getState(): CaptureValue;
	justPressed(): boolean;
	justReleased(): boolean;
	ongoing(): boolean;
	position2d(): Vector2;
	pressed(): boolean;
	previousDuration(): number;
	release(): void;
	triggered(): boolean;
}

/**
 * - Builds the `useCapture` hook for a FluxReact instance.
 * - Mounted means captured: the capture is acquired in an effect and released
 *   in its cleanup, so ownership tracks the component with no schedule slot.
 * - The returned token is the same object for the component's lifetime and
 *   reads inert until the capture lands, so no call site needs `token?.x()`.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param useFluxContext - Shared accessor for the Provider context value.
 * @returns A typed `useCapture` hook.
 */
export function createUseCapture<T extends ActionMap, Contexts extends string = string>(
	useFluxContext: () => FluxContextValue<T, Contexts>,
): FluxUseCapture<T> {
	function useCapture<A extends AllActions<T>>(action: A): CaptureToken<T, A>;
	function useCapture<A extends AllActions<T>>(
		handle: InputHandle,
		action: A,
	): CaptureToken<T, A>;
	function useCapture<A extends AllActions<T>>(
		handleOrAction: A | InputHandle,
		maybeAction?: A,
	): CaptureToken<T, A> {
		const { core, handle: defaultHandle } = useFluxContext();

		const hasStringFirst = typeIs(handleOrAction, "string");
		const handle = hasStringFirst ? defaultHandle : handleOrAction;
		const action = hasStringFirst ? handleOrAction : (maybeAction as AllActions<T>);

		const innerRef = useRef<CaptureTokenSurface | undefined>(undefined);
		const [initialInert] = useState(() => inertStateFor(core, handle, action));
		const inertRef = useRef(initialInert);
		const [facade] = useState(() => createCaptureFacade(innerRef, inertRef));

		useEffect(() => {
			inertRef.current = inertStateFor(core, handle, action);

			const token = core.getState(handle).capture(action) as unknown as CaptureTokenSurface;
			innerRef.current = token;

			return () => {
				token.release();
				// `innerRef` is deliberately left pointing at the released
				// token: core synthesizes a one-frame `canceled()` at the
				// capture boundary, and the reader must still see it while
				// tearing down.
			};
		}, [core, handle, action]);

		return facade as unknown as CaptureToken<T, A>;
	}

	return useCapture;
}

/**
 * - Builds the `useCaptureAction` hook for a FluxReact instance.
 * - Uses ref-based bail-out (NOT `setValue(prev)`) for the same reason
 *   `useAction` does: React-Lua does not reliably skip the first post-change
 *   flush when the functional updater returns the previous value.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param useFluxContext - Shared accessor for the Provider context value.
 * @returns A typed `useCaptureAction` hook.
 */
export function createUseCaptureAction<T extends ActionMap, Contexts extends string = string>(
	useFluxContext: () => FluxContextValue<T, Contexts>,
): FluxUseCaptureAction {
	function useCaptureAction<Token extends CaptureTokenLike, R>(
		token: Token,
		selector: (token: Token) => R,
	): R {
		const { subscribe } = useFluxContext();

		const [value, setValue] = useState(() => selector(token));
		const lastValueRef = useRef(value);

		useEffect(() => {
			lastValueRef.current = value;
		});

		useEffect(() => {
			return subscribe(() => {
				const updated = selector(token);
				if (lastValueRef.current === updated) {
					return;
				}

				lastValueRef.current = updated;
				setValue(updated);
			});
		}, [subscribe, token, selector]);

		return value;
	}

	return useCaptureAction;
}

/**
 * - Resolves the neutral value an uncaptured `getState()` reports.
 * - The action's kind is not carried by the hook's arguments, so the neutral
 *   value is derived from the shape of the action's current value. Resolved
 *   once per captured action rather than per read.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param core - The core owning the action.
 * @param handle - The handle the capture is scoped to.
 * @param action - The captured action name.
 * @returns The action type's neutral value.
 */
function inertStateFor<T extends ActionMap, Contexts extends string>(
	core: FluxCore<T, Contexts>,
	handle: InputHandle,
	action: AllActions<T>,
): CaptureValue {
	const value = core.getState(handle).getState(action);
	if (typeIs(value, "number")) {
		return 0;
	}

	if (typeIs(value, "Vector2")) {
		return Vector2.zero;
	}

	if (typeIs(value, "Vector3")) {
		return Vector3.zero;
	}

	return false;
}

/**
 * - Builds the stable facade returned by `useCapture`.
 * - Every read delegates to the captured token when one is held, and reports
 *   the suppressed result otherwise, matching what any non-holder reads.
 *
 * @param innerRef - Ref holding the live core token, absent until captured.
 * @param inertRef - Ref holding the captured action's neutral value.
 * @returns A token-shaped reader that outlives any single capture.
 */
function createCaptureFacade(
	innerRef: { current: CaptureTokenSurface | undefined },
	inertRef: { current: CaptureValue },
): CaptureTokenSurface {
	return {
		axis1d(): number {
			const inner = innerRef.current;
			return inner === undefined ? 0 : inner.axis1d();
		},
		axis3d(): Vector3 {
			const inner = innerRef.current;
			return inner === undefined ? Vector3.zero : inner.axis3d();
		},
		axisBecameActive(): boolean {
			const inner = innerRef.current;
			return inner === undefined ? false : inner.axisBecameActive();
		},
		axisBecameInactive(): boolean {
			const inner = innerRef.current;
			return inner === undefined ? false : inner.axisBecameInactive();
		},
		canceled(): boolean {
			const inner = innerRef.current;
			return inner === undefined ? false : inner.canceled();
		},
		claim(): boolean {
			const inner = innerRef.current;
			return inner === undefined ? false : inner.claim();
		},
		currentDuration(): number {
			const inner = innerRef.current;
			return inner === undefined ? 0 : inner.currentDuration();
		},
		direction2d(): Vector2 {
			const inner = innerRef.current;
			return inner === undefined ? Vector2.zero : inner.direction2d();
		},
		getState(): CaptureValue {
			const inner = innerRef.current;
			return inner === undefined ? inertRef.current : inner.getState();
		},
		justPressed(): boolean {
			const inner = innerRef.current;
			return inner === undefined ? false : inner.justPressed();
		},
		justReleased(): boolean {
			const inner = innerRef.current;
			return inner === undefined ? false : inner.justReleased();
		},
		ongoing(): boolean {
			const inner = innerRef.current;
			return inner === undefined ? false : inner.ongoing();
		},
		position2d(): Vector2 {
			const inner = innerRef.current;
			return inner === undefined ? Vector2.zero : inner.position2d();
		},
		pressed(): boolean {
			const inner = innerRef.current;
			return inner === undefined ? false : inner.pressed();
		},
		previousDuration(): number {
			const inner = innerRef.current;
			return inner === undefined ? 0 : inner.previousDuration();
		},
		release(): void {
			innerRef.current?.release();
		},
		triggered(): boolean {
			const inner = innerRef.current;
			return inner === undefined ? false : inner.triggered();
		},
	};
}
