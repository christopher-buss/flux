import type { RegExp } from "./stub";

export type MatcherFunction = (content: string, element: Instance | undefined) => boolean;
export type Matcher = MatcherFunction | number | RegExp | string;

// oxlint-disable-next-line typescript/no-empty-object-type
export type ByRoleMatcher = /* ARIARole | */ MatcherFunction | {};

export type NormalizerFn = (text: string) => string;

export interface NormalizerOptions extends DefaultNormalizerOptions {
	normalizer?: NormalizerFn;
}

export interface MatcherOptions {
	/** Use normalizer with getDefaultNormalizer instead. */
	collapseWhitespace?: boolean;
	exact?: boolean;
	normalizer?: NormalizerFn;
	/** Suppress suggestions for a specific query. */
	suggest?: boolean;
	/** Use normalizer with getDefaultNormalizer instead. */
	trim?: boolean;
}

export type Match = (
	textToMatch: string,
	node: Instance | undefined,
	matcher: Matcher,
	options?: MatcherOptions,
) => boolean;

export interface DefaultNormalizerOptions {
	collapseWhitespace?: boolean;
	trim?: boolean;
}

export function getDefaultNormalizer(options?: DefaultNormalizerOptions): NormalizerFn;

// N.B. Don't expose fuzzyMatches + matches here: they're not public API
