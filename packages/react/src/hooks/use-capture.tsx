import type { ActionMap, AllActions, CaptureToken, FluxCore, InputHandle } from "@rbxts/flux";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "@rbxts/react";

import type { FluxContextValue } from "../flux-context";

/**
 * Options accepted by `useCapture`.
 *
 * @remarks Read field by field on every render, so an inline object literal is
 * fine — a fresh options object does not re-acquire the capture.
 */
export interface UseCaptureOptions {
	/**
	 * Label recorded on the capture's `debugCaptures` entry, to tell holders
	 * apart when every acquisition in an app routes through this one hook and
	 * the tracebacks look identical.
	 *
	 * @remarks Dev-mode only, and read at acquisition: changing the label does
	 * not re-acquire the capture, so a new label applies to the next
	 * acquisition rather than the capture already held.
	 */
	readonly debugLabel?: string;

	/**
	 * Whether the surface holds the capture, defaulting to `true`.
	 *
	 * @remarks Mounted-means-captured is the default idiom, and needs no
	 * configuration. Reach for `enabled` only when ownership has to follow a
	 * condition that flips while the widget stays up — a focus layer tracking
	 * the engine's selected object, say. Expressing that by unmounting would
	 * force a component split under the Rules of Hooks, with the token trapped
	 * in a child that renders nothing.
	 *
	 * Toggling is symmetric: `false` releases, `true` re-captures. While
	 * disabled the token reads inert, exactly as it does before the capture
	 * lands and after it is released, so no call site branches on it. The one
	 * exception is `canceled()`: disabling mid-press is a capture boundary, and
	 * the resulting one-frame cancel is reported so a reader is never left with
	 * an unexplained falling edge.
	 */
	readonly enabled?: boolean;
}

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
	 * @param options - Optional capture options.
	 * @returns A stable token, inert until the capture lands.
	 */
	<A extends AllActions<T>>(action: A, options?: UseCaptureOptions): CaptureToken<T, A>;

	/**
	 * Captures an action for the component's lifetime, on an explicit handle.
	 *
	 * @template A - The captured action name, narrowing the token's reads.
	 * @param handle - The InputHandle to capture on (overrides Provider default).
	 * @param action - The action to capture.
	 * @param options - Optional capture options.
	 * @returns A stable token, inert until the capture lands.
	 */
	<A extends AllActions<T>>(
		handle: InputHandle,
		action: A,
		options?: UseCaptureOptions,
	): CaptureToken<T, A>;
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
	/**
	 * Whether this render asks to hold the capture at all.
	 *
	 * Part of the request rather than the effect alone, so a render that
	 * disables the capture goes inert in that same render instead of reading
	 * live until the effect catches up.
	 */
	readonly enabled: boolean;
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
 * @example
 * ```tsx
 * // The default idiom: mounted means captured, no configuration.
 * const confirm = useCapture("confirm");
 *
 * // `enabled` is for ownership that has to follow a condition flipping while
 * // the widget stays up, and `debugLabel` names the holder in `debugCaptures`.
 * const confirm = useCapture("confirm", { debugLabel: "hud", enabled: focused });
 * ```
 *
 * @remarks Setting `enabled` to false makes every read inert from that render
 * on — except `canceled()`. Dropping a capture mid-press is a capture boundary
 * like any other, and core records the one-frame cancel against this very
 * viewer, so the hook reports it. A child handed the token never sees
 * `enabled`; swallowing the cancel would leave it watching `pressed()` fall
 * with no verb explaining why, indistinguishable from the user letting go. A
 * changed action is different and still swallows: that cancel belongs to a
 * different action.
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
	function useCapture<A extends AllActions<T>>(
		action: A,
		options?: UseCaptureOptions,
	): CaptureToken<T, A>;
	function useCapture<A extends AllActions<T>>(
		handle: InputHandle,
		action: A,
		options?: UseCaptureOptions,
	): CaptureToken<T, A>;
	function useCapture<A extends AllActions<T>>(
		handleOrAction: A | InputHandle,
		actionOrOptions?: A | UseCaptureOptions,
		maybeOptions?: UseCaptureOptions,
	): CaptureToken<T, A> {
		const { core, handle: defaultHandle } = useFluxContext();

		const hasStringFirst = typeIs(handleOrAction, "string");
		const handle = hasStringFirst ? defaultHandle : handleOrAction;
		const action = hasStringFirst ? handleOrAction : (actionOrOptions as AllActions<T>);
		const options = hasStringFirst
			? (actionOrOptions as undefined | UseCaptureOptions)
			: maybeOptions;
		const isEnabled = options?.enabled ?? true;
		const debugLabel = options?.debugLabel;

		const holdRef = useRef<CaptureHold<T, Contexts> | undefined>(undefined);
		const releasedRef = useRef(true);

		// The neutral value is a property of the captured triple alone, so
		// `enabled` layers on top of it rather than feeding it: a surface whose
		// `enabled` tracks focus can toggle at frame rate, and re-deriving the
		// neutral value on each flip would be waste. Splitting the two memos is
		// what keeps `enabled` out of the capture identity.
		const captured = useMemo(() => makeCaptured(core, handle, action), [core, handle, action]);

		// The effect closes over the request this render derived rather than
		// reading a cell when it runs, so the hold it stores is structurally
		// the one its own render asked for. Request identity changes exactly
		// when the captured triple or `enabled` does, so this is also the whole
		// dependency list.
		const request = useMemo(() => ({ ...captured, enabled: isEnabled }), [captured, isEnabled]);

		// The facade is built once and handed out for the component's lifetime,
		// so it cannot close over `request` — it reads this cell to answer
		// "what does the latest render ask for?", which is how a commit between
		// an action change and its effect reads inert rather than reporting the
		// previous action.
		//
		// This is the one write React's docs warn about that the design cannot
		// avoid: a child may read the facade during its own render, which is
		// strictly before any effect of this one. It is sound here because the
		// write is idempotent for a given render — StrictMode's double render
		// derives the same request — and react-lua 17.3.7 renders legacy roots
		// synchronously, so a discarded render is always followed by an unmount
		// or a re-render that rewrites it. A concurrent renderer would
		// invalidate the second reason.
		const requestRef = useRef(request);
		// eslint-disable-next-line react/refs -- see above; the facade is read during render
		requestRef.current = request;

		function buildFacade(): CaptureTokenSurface {
			return createCaptureFacade({ holdRef, releasedRef, requestRef });
		}

		const [facade] = useState(buildFacade);

		// `debugLabel` is dev-only metadata, so it is read at acquisition
		// rather than joining the request identity: a changing label must not
		// churn the capture stack the way a changing action legitimately does.
		// A layout effect is early enough — it runs before the passive effect
		// below in the same commit — so this stays out of render.
		const debugLabelRef = useRef(debugLabel);
		useLayoutEffect(() => {
			debugLabelRef.current = debugLabel;
		}, [debugLabel]);

		useEffect(() => {
			if (!request.enabled) {
				// Nothing to acquire, and nothing to leave behind: the render
				// that disabled the capture already rebuilt the request, so
				// every read but `canceled()` reads stale and inert.
				return;
			}

			const label = debugLabelRef.current;
			const token = request.core.getState(request.handle).capture(request.action, {
				...(label !== undefined ? { debugLabel: label } : {}),
			}) as unknown as CaptureTokenSurface;
			holdRef.current = { request, token };
			releasedRef.current = false;

			return () => {
				releasedRef.current = true;
				token.release();
				// `holdRef` deliberately keeps the released token: core
				// synthesizes a one-frame `canceled()` at the capture
				// boundary, and the reader must still see it while tearing
				// down. Every other read reports inert once released.
			};
		}, [request]);

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
function createCaptureFacade<T extends ActionMap, Contexts extends string>({
	holdRef,
	releasedRef,
	requestRef,
}: CaptureReader<T, Contexts>): CaptureTokenSurface {
	function current(): CaptureHold<T, Contexts> | undefined {
		const hold = holdRef.current;
		if (hold?.request !== requestRef.current) {
			return undefined;
		}

		return hold;
	}

	function currentForCancel(): CaptureHold<T, Contexts> | undefined {
		const hold = holdRef.current;
		if (hold === undefined) {
			return undefined;
		}

		const request = requestRef.current;
		if (hold.request === request) {
			return hold;
		}

		// Same action on the same core and handle, so only `enabled` withdrew:
		// core recorded the boundary cancel against this very viewer, and it is
		// still ours to report. A changed action fails this and stays swallowed,
		// because that cancel belongs to a different action entirely.
		return hold.request.action === request.action &&
			hold.request.core === request.core &&
			hold.request.handle === request.handle
			? hold
			: undefined;
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
			// see it. Nor on `enabled` — a mid-press disable is a boundary like
			// any other, and a child handed this token never sees `enabled`, so
			// swallowing it would leave a bare falling edge with no verb.
			// Staleness still applies to the action: a changed action reports
			// its own cancels, never the previous action's.
			const hold = currentForCancel();
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

/**
 * - Resolves the part of a capture request that the triple alone decides,
 *   neutral value included.
 * - Built only when the triple changes, so the core lookup behind the neutral
 *   value costs nothing per render or per read, and an `enabled` that toggles
 *   at frame rate never triggers it.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param core - The core owning the action.
 * @param handle - The handle the capture is scoped to.
 * @param action - The action to capture.
 * @returns The request less `enabled`, which the caller layers on.
 */
function makeCaptured<T extends ActionMap, Contexts extends string>(
	core: FluxCore<T, Contexts>,
	handle: InputHandle,
	action: AllActions<T>,
): Omit<CaptureRequest<T, Contexts>, "enabled"> {
	return { action, core, handle, inert: core.getNeutralValue(action) };
}
