/* cspell:words alttext displayvalue labeltext placeholdertext */
import type { RegExp } from "./stub";

/** Options map for configuring a suggested query. */
export type QueryOptions = Record<string, boolean | RegExp>;

/** Tuple of query name string and optional query options. */
export type QueryArgs = [string, QueryOptions?];

/** A suggested alternative query for an element. */
export interface Suggestion {
	/** Arguments to pass to the suggested query method. */
	queryArgs: QueryArgs;
	/** Full method name of the suggested query (e.g. "getByText"). */
	queryMethod: string;
	/** Base name of the query (e.g. "Text", "TestId"). */
	queryName: string;
	/** Returns a human-readable string representation of the suggestion. */
	toString(): string;
	/** Variant prefix of the query (e.g. "get", "find"). */
	variant: string;
	/** Optional warning message about the suggestion. */
	warning?: string;
}

/** Query variant prefix indicating the lookup strategy. */
export type Variant = "find" | "findAll" | "get" | "getAll" | "query" | "queryAll";

/** Query method suffix indicating the attribute to match against. */
export type Method =
	// | "AltText"
	// | "alttext"
	| "DisplayValue"
	| "displayvalue"
	// | "LabelText"
	// | "labeltext"
	| "PlaceholderText"
	| "placeholdertext"
	// | "Role"
	// | "role"
	| "TestId"
	| "testid"
	| "Text"
	| "text";
// | "Title"
// | "title";

/**
 * Get a suggested query for the given element.
 *
 * @param element - The element to suggest a query for.
 * @param variant - The query variant to suggest.
 * @param method - The query method to suggest.
 * @returns A suggestion object, or undefined if no suggestion is available.
 */
export function getSuggestedQuery(
	element: Instance,
	variant?: Variant,
	method?: Method,
): Suggestion | undefined;
