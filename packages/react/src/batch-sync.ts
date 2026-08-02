// The augmentation is only picked up by `include` under `tsconfig.lib.json`.
// Specs pull this module in as a dependency rather than by glob, so without the
// reference `flushSync` is missing from their program.
/// <reference path="./react-roblox.d.ts" />

import { flushSync } from "@rbxts/react-roblox";

/** True while an outer `batchSync` owns the flush. */
let isBatching = false;

/**
 * - Renders everything `callback` schedules in one synchronous commit.
 * - Re-entrant, which plain `flushSync` is not: react-lua flushes the sync
 *   queue in every `flushSync`'s finally block, so a nested call commits
 *   whatever was scheduled before it and splits one batch in two.
 *
 * Only the outermost call enters `flushSync`. Nested calls run inline, so their
 * updates join the batch the outer call flushes.
 *
 * @param callback - Runs immediately; its updates render at sync lane.
 * @example
 * ```ts
 * batchSync(() => {
 * 	for (const listener of listeners) {
 * 		listener();
 * 	}
 * });
 * ```
 */
export function batchSync(callback: () => void): void {
	if (isBatching) {
		callback();
		return;
	}

	isBatching = true;
	try {
		flushSync(callback);
	} finally {
		isBatching = false;
	}
}
