/* eslint-disable @cspell/spellchecker, flawless/naming-convention, jsdoc/require-jsdoc, jsdoc/require-param, jsdoc/require-returns -- PROTOTYPE (#158): throwaway Node code, Roblox repo rules do not apply */
// PROTOTYPE — the candidate hook shape under test (shape B: stable reader,
// inert until the capture lands). This file is the artifact to react to.

import type { CaptureToken, MiniFlux } from "./mini-flux.ts";
import { useEffect, useRef, useSubscription } from "./mini-react.ts";

export interface UseCaptureOptions {
	/** Optional dev-mode label surfaced by debugCaptures() (#157). */
	debugLabel?: string;
	/** Capture only while true. Omitted = capture while mounted. */
	enabled?: boolean;
}

/**
 * Per-widget standing capture of an action (#153): capture in an effect on
 * mount (or when `enabled` flips true), release in cleanup. Re-renders never
 * re-capture — dedup is deps-based, per #153 "no dedup in core". StrictMode
 * double-mount capture/release/capture is safe: release is idempotent and the
 * LIFO stack restores with no gap.
 *
 * Always returns the same stable reader (shape B). Before the capturing effect
 * runs, while disabled, or after release it reads inert — one rule with
 * shadowed tokens (#153/#156), so dispatch code never branches on undefined.
 * The inner core token is kept after release so the one-frame synthesized
 * canceled() (#155) still reaches the reader. Claim()/release() before any
 * capture are no-ops.
 */
export function useCapture(
	flux: MiniFlux,
	action: "confirm",
	options?: UseCaptureOptions,
): CaptureToken {
	const enabled = options?.enabled ?? true;
	const debugLabel = options?.debugLabel;
	const inner = useRef<CaptureToken | undefined>(undefined);
	const reader = useRef<CaptureToken | undefined>(undefined);

	reader.current ??= {
		canceled: () => inner.current?.canceled() ?? false,
		claim: () => inner.current?.claim() ?? false,
		justPressed: () => inner.current?.justPressed() ?? false,
		justReleased: () => inner.current?.justReleased() ?? false,
		pressed: () => inner.current?.pressed() ?? false,
		release: () => inner.current?.release(),
	};

	useEffect(() => {
		if (!enabled) {
			return;
		}

		const captured = flux.capture(debugLabel ?? action);
		inner.current = captured;
		/**
		 * Release but keep inner: released tokens read inert-except-cancel.
		 */
		return () => {
			captured.release();
		};
	}, [flux, action, enabled]);

	return reader.current;
}

/**
 * Selector form: reactive value read *through the token*, re-evaluated on the
 * wrapper's update signal (same plumbing as useAction). This is both the
 * rendering path (highlight while pressed) and — with useEffect on the value —
 * the dispatch path in a stack with no per-frame hook.
 *
 * @template R - The selected value type.
 */
export function useCaptureAction<R>(token: CaptureToken, selector: (token: CaptureToken) => R): R {
	return useSubscription(() => selector(token));
}
