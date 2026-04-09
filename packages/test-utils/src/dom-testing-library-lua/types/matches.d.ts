import type { RegExp } from "./stub";

/** Custom function to match against element text content. */
export type MatcherFunction = (content: string, element: Instance | undefined) => boolean;

/** Value used to match against element content or attributes. */
export type Matcher = MatcherFunction | number | RegExp | string;

// ARIARole not yet supported
/** Matcher for role-based queries, accepting a role string or custom function. */
export type ByRoleMatcher = MatcherFunction | object;

/** Function that normalizes text before matching. */
export type NormalizerFunc = (text: string) => string;

/** Options for the default text normalizer. */
export interface DefaultNormalizerOptions {
	/** Whether to collapse multiple whitespace characters into one. */
	collapseWhitespace?: boolean;
	/** Whether to trim leading and trailing whitespace. */
	trim?: boolean;
}

/** Options including a custom normalizer function. */
export interface NormalizerOptions extends DefaultNormalizerOptions {
	/** Custom normalizer function to apply to text before matching. */
	normalizer?: NormalizerFunc;
}

/** Options for configuring query matching behavior. */
export interface MatcherOptions {
	/** Use normalizer with getDefaultNormalizer instead. */
	collapseWhitespace?: boolean;
	/**
	 * Whether to use exact string matching or substring matching.
	 *
	 * @default true
	 */
	exact?: boolean;
	/** Custom normalizer function to apply to text before matching. */
	normalizer?: NormalizerFunc;
	/** Suppress suggestions for a specific query. */
	suggest?: boolean;
	/** Use normalizer with getDefaultNormalizer instead. */
	trim?: boolean;
}

/**
 * Function that checks whether text matches a given matcher.
 *
 * @param textToMatch - The text content to check.
 * @param node - The element being matched against.
 * @param matcher - The matcher value or function.
 * @param options - Optional matching configuration.
 */
export type Match = (
	textToMatch: string,
	node: Instance | undefined,
	matcher: Matcher,
	options?: MatcherOptions,
) => boolean;

/**
 * Create a normalizer function with the given options.
 *
 * @param options - Options controlling trim and whitespace collapsing.
 * @returns A normalizer function configured with the given options.
 */
export function getDefaultNormalizer(options?: DefaultNormalizerOptions): NormalizerFunc;

// N.B. Don't expose fuzzyMatches + matches here: they're not public API
