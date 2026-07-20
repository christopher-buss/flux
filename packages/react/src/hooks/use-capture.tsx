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
 * The `useCaptureAction` hook type: reads through a capture token and
 * re-renders when the selected value changes.
 *
 * @template Token - The token type, usually a `CaptureToken`.
 * @template R - The selected value type.
 * @param token - The token returned by `useCapture`.
 * @param selector - Function that extracts a value from the token.
 * @returns The selected value.
 */
export type FluxUseCaptureAction = <Token, R>(token: Token, selector: (token: Token) => R) => R;

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
 * Where the facade looks up an inert `getState()` value.
 *
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 */
interface CaptureSource<T extends ActionMap, Contexts extends string> {
	/** The captured action name. */
	readonly action: AllActions<T>;
	/** The core owning the action. */
	readonly core: FluxCore<T, Contexts>;
	/** The handle the capture is scoped to. */
	readonly handle: InputHandle;
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
		const sourceRef = useRef<CaptureSource<T, Contexts>>({ action, core, handle });
		const [facade] = useState(() => createCaptureFacade(innerRef, sourceRef));

		useEffect(() => {
			sourceRef.current = { action, core, handle };

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
	function useCaptureAction<Token, R>(token: Token, selector: (token: Token) => R): R {
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
 * @param source - The action being captured and the core and handle owning it.
 * @returns The action type's neutral value.
 */
function inertStateFor<T extends ActionMap, Contexts extends string>(
	source: CaptureSource<T, Contexts>,
): CaptureValue {
	const value = source.core.getState(source.handle).getState(source.action);
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
 * @template T - The action map type.
 * @template Contexts - Union of valid context name literals.
 * @param innerRef - Ref holding the live core token, absent until captured.
 * @param sourceRef - Ref holding the action being captured and its owner.
 * @returns A token-shaped reader that outlives any single capture.
 */
function createCaptureFacade<T extends ActionMap, Contexts extends string>(
	innerRef: { current: CaptureTokenSurface | undefined },
	sourceRef: { current: CaptureSource<T, Contexts> },
): CaptureTokenSurface {
	function flagRead(pick: (token: CaptureTokenSurface) => boolean): boolean {
		const inner = innerRef.current;
		return inner === undefined ? false : pick(inner);
	}

	function numberRead(pick: (token: CaptureTokenSurface) => number): number {
		const inner = innerRef.current;
		return inner === undefined ? 0 : pick(inner);
	}

	return {
		axis1d(): number {
			return numberRead((inner) => inner.axis1d());
		},
		axis3d(): Vector3 {
			const inner = innerRef.current;
			return inner === undefined ? Vector3.zero : inner.axis3d();
		},
		axisBecameActive(): boolean {
			return flagRead((inner) => inner.axisBecameActive());
		},
		axisBecameInactive(): boolean {
			return flagRead((inner) => inner.axisBecameInactive());
		},
		canceled(): boolean {
			return flagRead((inner) => inner.canceled());
		},
		claim(): boolean {
			return flagRead((inner) => inner.claim());
		},
		currentDuration(): number {
			return numberRead((inner) => inner.currentDuration());
		},
		direction2d(): Vector2 {
			const inner = innerRef.current;
			return inner === undefined ? Vector2.zero : inner.direction2d();
		},
		getState(): CaptureValue {
			const inner = innerRef.current;
			return inner === undefined ? inertStateFor(sourceRef.current) : inner.getState();
		},
		justPressed(): boolean {
			return flagRead((inner) => inner.justPressed());
		},
		justReleased(): boolean {
			return flagRead((inner) => inner.justReleased());
		},
		ongoing(): boolean {
			return flagRead((inner) => inner.ongoing());
		},
		position2d(): Vector2 {
			const inner = innerRef.current;
			return inner === undefined ? Vector2.zero : inner.position2d();
		},
		pressed(): boolean {
			return flagRead((inner) => inner.pressed());
		},
		previousDuration(): number {
			return numberRead((inner) => inner.previousDuration());
		},
		release(): void {
			innerRef.current?.release();
		},
		triggered(): boolean {
			return flagRead((inner) => inner.triggered());
		},
	};
}
