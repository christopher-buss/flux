import type { Matcher, MatcherOptions } from "./matches";
import type { WaitForOptions } from "./wait-for";

/** Mixin interface that adds an optional `suggest` flag to query options. */
export interface WithSuggest {
	/** Whether to show query suggestions when this query is used. */
	suggest?: boolean;
}

/**
 * Factory type for functions that produce error messages for query failures.
 *
 * @template Arguments - Tuple of arguments passed to the error factory.
 */
export type GetErrorFunction<Arguments extends Array<unknown> = [string]> = (
	c: Instance | undefined,
	...args: Arguments
) => string;

/** Matcher options extended with selector and ignore filters. */
export interface SelectorMatcherOptions extends MatcherOptions {
	/** Whether to ignore certain nodes, or a CSS selector string of nodes to ignore. */
	ignore?: boolean | string;
	/** CSS selectors to narrow down candidate elements. */
	selector?: Array<string>;
}

/**
 * Query a single element by attribute, returning undefined if not found.
 *
 * @param attribute - The attribute name to match.
 * @param container - The root element to search within.
 * @param id - The matcher for the attribute value.
 * @param options - Optional matching configuration.
 */
export type QueryByAttribute = (
	attribute: string,
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => Instance | undefined;

/**
 * Query all elements by attribute.
 *
 * @param attribute - The attribute name to match.
 * @param container - The root element to search within.
 * @param id - The matcher for the attribute value.
 * @param options - Optional matching configuration.
 */
export type AllByAttribute = (
	attribute: string,
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => Array<Instance>;

/** Creates an error for element query failures with container context. */
export type getElementError = (message: string | undefined, container: Instance) => Error;

/**
 * Generic query method signature where only the return type varies.
 *
 * @template Arguments - Tuple of query arguments.
 * @template Return - The return type of the query.
 */
export type QueryMethod<Arguments extends Array<unknown>, Return> = (
	container: Instance,
	...args: Arguments
) => Return;

/**
 * Query method that returns a single element or undefined.
 *
 * @template Arguments - Tuple of query arguments.
 */
export type QueryBy<Arguments extends Array<unknown>> = QueryMethod<
	Arguments,
	Instance | undefined
>;

/**
 * Query method that returns all matching elements.
 *
 * @template Arguments - Tuple of query arguments.
 */
export type GetAllBy<Arguments extends Array<unknown>> = QueryMethod<Arguments, Array<Instance>>;

/**
 * Async query method that finds all matching elements.
 *
 * @template Arguments - Tuple of query arguments.
 */
export type FindAllBy<Arguments extends Array<unknown>> = QueryMethod<
	[Arguments[0], Arguments[1]?, WaitForOptions?],
	Promise<Array<Instance>>
>;

/**
 * Query method that returns exactly one element, throwing if not found.
 *
 * @template Arguments - Tuple of query arguments.
 */
export type GetBy<Arguments extends Array<unknown>> = QueryMethod<Arguments, Instance>;

/**
 * Async query method that finds exactly one element.
 *
 * @template Arguments - Tuple of query arguments.
 */
export type FindBy<Arguments extends Array<unknown>> = QueryMethod<
	[Arguments[0], Arguments[1]?, WaitForOptions?],
	Promise<Instance>
>;

/**
 * Tuple of all built query method variants for a given argument signature.
 *
 * @template Arguments - Tuple of query arguments.
 */
export type BuiltQueryMethods<Arguments extends Array<unknown>> = [
	QueryBy<Arguments>,
	GetAllBy<Arguments>,
	GetBy<Arguments>,
	FindAllBy<Arguments>,
	FindBy<Arguments>,
];

interface Error {
	name: string;
	message: string;
	stack?: string;
}
export function queryByAttribute(
	attribute: string,
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
): Instance | undefined;

export function queryAllByAttribute(
	attribute: string,
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
): Array<Instance>;

export function buildQueries<Arguments extends Array<unknown>>(
	queryAllBy: GetAllBy<Arguments>,
	getMultipleError: GetErrorFunction<Arguments>,
	getMissingError: GetErrorFunction<Arguments>,
): BuiltQueryMethods<Arguments>;
