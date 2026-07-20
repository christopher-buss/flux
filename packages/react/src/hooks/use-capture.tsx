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

/**
 * The full runtime shape of a capture token — every processed read with the
 * action pre-bound. The public `CaptureToken` type narrows this to the
 * action's kind; the facade implements all of it and is cast on the way out.
 */
export interface CaptureTokenSurface {
	/** The captured action's current scalar value. */
	axis1d(): number;
	/** The captured action's current 3D vector value. */
	axis3d(): Vector3;
	/** Whether the captured axis just became active. */
	axisBecameActive(): boolean;
	/** Whether the captured axis just became inactive. */
	axisBecameInactive(): boolean;
	/** Whether the action was canceled this frame, by trigger or boundary. */
	canceled(): boolean;
	/** Claims the captured action for the rest of the frame. */
	claim(): boolean;
	/** The captured action's current trigger state duration. */
	currentDuration(): number;
	/** The captured action's current 2D directional vector. */
	direction2d(): Vector2;
	/** The captured action's typed runtime value. */
	getState(): CaptureValue;
	/** Whether the captured action's trigger just fired. */
	justPressed(): boolean;
	/** Whether the captured action's trigger just stopped firing. */
	justReleased(): boolean;
	/** Whether the captured action's trigger is ongoing. */
	ongoing(): boolean;
	/** The captured action's screen-space position. */
	position2d(): Vector2;
	/** Whether the captured action's trigger is currently "triggered". */
	pressed(): boolean;
	/** The captured action's previous trigger state duration. */
	previousDuration(): number;
	/** Releases the capture, restoring the holder beneath or normal reads. */
	release(): void;
	/** Whether the captured action's trigger conditions were met this frame. */
	triggered(): boolean;
}

/** Any value an action can hold. */
type CaptureValue = boolean | number | Vector2 | Vector3;

/**
 * What a render asks the hook to capture.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
interface CaptureRequest<T extends ActionMap, Contexts extends string> {
	/** The action to capture. */
	readonly action: AllActions<T>;
	/** The core owning the action. */
	readonly core: FluxCore<T, Contexts>;
	/** The handle the capture is scoped to. */
	readonly handle: InputHandle;
	/**
	 * The neutral value an uncaptured `getState()` reports for this action.
	 *
	 * Resolved with the rest of the request, so a changed action reports its
	 * own kind's neutral in the commit before the capture lands rather than
	 * the previous action's.
	 */
	readonly inert: CaptureValue;
}

/**
 * A capture the hook acquired, and what it was acquired for.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
interface CaptureHold<T extends ActionMap, Contexts extends string> {
	/**
	 * The request this capture was acquired for.
	 *
	 * A request object is only rebuilt when what the hook captures actually
	 * changes, so identity alone answers "is this hold still current?".
	 */
	readonly request: CaptureRequest<T, Contexts>;
	/** The core token acquired for that request. */
	readonly token: CaptureTokenSurface;
}

/**
 * Everything the stable facade reads through.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
interface CaptureReader<T extends ActionMap, Contexts extends string> {
	/** Ref holding the acquired capture, absent until the effect runs. */
	readonly holdRef: { current: CaptureHold<T, Contexts> | undefined };
	/** Ref recording whether the held capture has been released. */
	readonly releasedRef: { current: boolean };
	/** Ref holding what the latest render asks to capture. */
	readonly requestRef: { current: CaptureRequest<T, Contexts> };
}

/**
 * - Builds the `useCapture` hook for a FluxReact instance.
 * - Mounted means captured: the capture is acquired in an effect and released
 *   in its cleanup, so ownership tracks the component with no schedule slot.
 * - The returned token is the same object for the component's lifetime and
 *   reads inert until the capture lands, so no call site needs `token?.x()`.
 *
 * @remarks `canceled()` is the one read that keeps delegating after release,
 * so the one-frame boundary cancel reaches a reader that is tearing down. A
 * consumer that keeps the token past unmount therefore keeps seeing that
 * action's trigger cancels; every other read is inert. Do not retain a token
 * beyond the component that captured it.
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

		const holdRef = useRef<CaptureHold<T, Contexts> | undefined>(undefined);
		const releasedRef = useRef(true);
		const [initialRequest] = useState(() => makeRequest(core, handle, action));
		const requestRef = useRef(initialRequest);
		function buildFacade(): CaptureTokenSurface {
			return createCaptureFacade({ holdRef, releasedRef, requestRef });
		}

		const [facade] = useState(buildFacade);

		// The reader is only live while the held token matches what this
		// render asks for, so the commit between an action change and its
		// effect reads inert rather than reporting the previous action. The
		// request is resolved during render because the facade is read during
		// render, before any effect has run.
		//
		// Writing a ref during render is the pattern React's docs warn about,
		// and `eslint-plugin-react-hooks` v7 is the ruleset that polices it.
		// It is sound here for two reasons: the write is idempotent for a
		// given render (StrictMode's double render produces the same request),
		// and react-lua 17.3.7 renders legacy roots synchronously, so a
		// discarded render is always followed by an unmount or a re-render
		// that rewrites this. A concurrent renderer would invalidate the
		// second reason.
		const request = requestRef.current;
		if (request.action !== action || request.core !== core || request.handle !== handle) {
			requestRef.current = makeRequest(core, handle, action);
		}

		useEffect(() => {
			const token = core.getState(handle).capture(action) as unknown as CaptureTokenSurface;
			holdRef.current = { request: requestRef.current, token };
			releasedRef.current = false;

			return () => {
				releasedRef.current = true;
				token.release();
				// `holdRef` deliberately keeps the released token: core
				// synthesizes a one-frame `canceled()` at the capture
				// boundary, and the reader must still see it while tearing
				// down. Every other read reports inert once released.
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
 *   value is derived from the shape of the action's current value.
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
 * - Resolves what a render asks the hook to capture, neutral value included.
 * - Built only when the request changes, so the `getState()` lookup behind the
 *   neutral value costs nothing per render or per read.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param core - The core owning the action.
 * @param handle - The handle the capture is scoped to.
 * @param action - The action to capture.
 * @returns The request, ready to compare against the current hold.
 */
function makeRequest<T extends ActionMap, Contexts extends string>(
	core: FluxCore<T, Contexts>,
	handle: InputHandle,
	action: AllActions<T>,
): CaptureRequest<T, Contexts> {
	return { action, core, handle, inert: inertStateFor(core, handle, action) };
}

/**
 * - Builds the stable facade returned by `useCapture`.
 * - Every read delegates to the held token while the capture is live, and
 *   reports the suppressed result otherwise — before the capture lands, after
 *   it is released, and during the commit where a changed action has not been
 *   captured yet.
 * - `canceled()` makes one exception: it still delegates after release, so
 *   core's one-frame boundary cancel reaches a reader that is tearing down.
 *   It is staleness-checked like every other read, so a changed action never
 *   reports the previous action's cancel.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param reader - The refs the facade reads the current capture through.
 * @returns A token-shaped reader that outlives any single capture.
 */
function createCaptureFacade<T extends ActionMap, Contexts extends string>(
	reader: CaptureReader<T, Contexts>,
): CaptureTokenSurface {
	const { holdRef, releasedRef, requestRef } = reader;

	function current(): CaptureHold<T, Contexts> | undefined {
		const hold = holdRef.current;
		if (hold?.request !== requestRef.current) {
			return undefined;
		}

		return hold;
	}

	function live(): CaptureTokenSurface | undefined {
		if (releasedRef.current) {
			return undefined;
		}

		return current()?.token;
	}

	return {
		axis1d(): number {
			const inner = live();
			return inner === undefined ? 0 : inner.axis1d();
		},
		axis3d(): Vector3 {
			const inner = live();
			return inner === undefined ? Vector3.zero : inner.axis3d();
		},
		axisBecameActive(): boolean {
			const inner = live();
			return inner === undefined ? false : inner.axisBecameActive();
		},
		axisBecameInactive(): boolean {
			const inner = live();
			return inner === undefined ? false : inner.axisBecameInactive();
		},
		canceled(): boolean {
			// Deliberately not gated on release: core synthesizes the boundary
			// cancel as the capture drops, and the reader tearing down has to
			// see it. Staleness still applies — a changed action reports its
			// own cancels, never the previous action's.
			const hold = current();
			return hold === undefined ? false : hold.token.canceled();
		},
		claim(): boolean {
			const inner = live();
			return inner === undefined ? false : inner.claim();
		},
		currentDuration(): number {
			const inner = live();
			return inner === undefined ? 0 : inner.currentDuration();
		},
		direction2d(): Vector2 {
			const inner = live();
			return inner === undefined ? Vector2.zero : inner.direction2d();
		},
		getState(): CaptureValue {
			const inner = live();
			return inner === undefined ? requestRef.current.inert : inner.getState();
		},
		justPressed(): boolean {
			const inner = live();
			return inner === undefined ? false : inner.justPressed();
		},
		justReleased(): boolean {
			const inner = live();
			return inner === undefined ? false : inner.justReleased();
		},
		ongoing(): boolean {
			const inner = live();
			return inner === undefined ? false : inner.ongoing();
		},
		position2d(): Vector2 {
			const inner = live();
			return inner === undefined ? Vector2.zero : inner.position2d();
		},
		pressed(): boolean {
			const inner = live();
			return inner === undefined ? false : inner.pressed();
		},
		previousDuration(): number {
			const inner = live();
			return inner === undefined ? 0 : inner.previousDuration();
		},
		release(): void {
			const inner = live();
			if (inner === undefined) {
				return;
			}

			releasedRef.current = true;
			inner.release();
		},
		triggered(): boolean {
			const inner = live();
			return inner === undefined ? false : inner.triggered();
		},
	};
}
