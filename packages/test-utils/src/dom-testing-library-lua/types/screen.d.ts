import type { OptionsReceived } from "@rbxts/pretty-format";

import type { BoundFunctions, Queries } from "./get-queries-for-element";
import type * as queries from "./queries";

/**
 * Pre-bound queries scoped to `document.body` with debug helpers.
 *
 * @template Q - The set of queries bound to the screen.
 */
export type Screen<Q extends Queries = typeof queries> = BoundFunctions<Q> & {
	/**
	 * Convenience function for `pretty-dom` which also allows an array of
	 * elements.
	 */
	debug: (
		element?: Array<Instance> | Instance,
		maxLength?: number,
		options?: OptionsReceived,
	) => void;
	/**
	 * Convenience function for `Testing Playground` which logs URL that can be
	 * opened in a browser.
	 */
	logTestingPlaygroundURL: (element?: Instance) => void;
};

export const screen: Screen;
