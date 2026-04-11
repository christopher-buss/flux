/** Result returned by `RegExp.exec`, extending an array of matched strings. */
export type RegExpExecArray = Array<string> & {
	/** Index of the match in the input string. */
	index?: number;
	/** The original input string. */
	input?: string;
	/** Number of captures in the match. */
	n: number;
};

/** Luau-compatible regular expression interface. */
export interface RegExp {
	/**
	 * Execute a search for a match in the input string.
	 *
	 * @param input - The string to test against.
	 */
	exec: (input: string) => RegExpExecArray | undefined;
	/**
	 * Test whether the input string matches the pattern.
	 *
	 * @param input - The string to test against.
	 */
	test: (input: string) => boolean;
}

/** Luau-compatible error interface. */
export interface Error {
	/** The name of the error (e.g. "Error", "TypeError"). */
	name: string;
	/** Human-readable description of the error. */
	message: string;
	/** Optional stack trace string. */
	stack?: string;
}
