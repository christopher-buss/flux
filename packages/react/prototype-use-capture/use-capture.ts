/* eslint-disable @cspell/spellchecker, flawless/naming-convention, jsdoc/require-jsdoc, jsdoc/require-param, jsdoc/require-returns -- PROTOTYPE (#158): throwaway Node code, Roblox repo rules do not apply */
// PROTOTYPE — the candidate hook shape under test. This file is the artifact
// to react to; everything around it is scaffolding.

import type { CaptureToken, MiniFlux } from "./mini-flux.ts";
import { useEffect, useState } from "./mini-react.ts";

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
 * Returns the scoped reader token (#156), or undefined until the capturing
 * effect has run / while disabled.
 */
export function useCapture(
	flux: MiniFlux,
	action: "confirm",
	options?: UseCaptureOptions,
): CaptureToken | undefined {
	const enabled = options?.enabled ?? true;
	const debugLabel = options?.debugLabel;
	const [token, setToken] = useState<CaptureToken | undefined>(undefined);

	useEffect(() => {
		if (!enabled) {
			setToken(undefined);
			return;
		}

		const captured = flux.capture(debugLabel ?? action);
		setToken(captured);
		return () => {
			captured.release();
			setToken(undefined);
		};
	}, [flux, action, enabled]);

	return token;
}
