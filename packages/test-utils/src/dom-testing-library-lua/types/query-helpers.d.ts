/* oxlint-disable small-rules/no-shorthand-names -- cannot do anything dude */
import type { Matcher, MatcherOptions } from "./matches";
import type { WaitForOptions } from "./wait-for";

interface Error {
	name: string;
	message: string;
	stack?: string;
}

export interface WithSuggest {
	suggest?: boolean;
}

export type GetErrorFunction<Arguments extends Array<unknown> = [string]> = (
	c: Instance | undefined,
	...args: Arguments
) => string;

export interface SelectorMatcherOptions extends MatcherOptions {
	ignore?: boolean | string;
	selector?: Array<string>;
}

export type QueryByAttribute = (
	attribute: string,
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => Instance | undefined;

export type AllByAttribute = (
	attribute: string,
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => Array<Instance>;

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
export type getElementError = (message: string | undefined, container: Instance) => Error;

/** Query methods have a common call signature. Only the return type differs. */
export type QueryMethod<Arguments extends Array<unknown>, Return> = (container: Instance, ...args: Arguments) => Return;
export type QueryBy<Arguments extends Array<unknown>> = QueryMethod<Arguments, Instance | undefined>;
export type GetAllBy<Arguments extends Array<unknown>> = QueryMethod<Arguments, Array<Instance>>;
export type FindAllBy<Arguments extends Array<unknown>> = QueryMethod<
	[Arguments[0], Arguments[1]?, WaitForOptions?],
	Promise<Array<Instance>>
>;
export type GetBy<Arguments extends Array<unknown>> = QueryMethod<Arguments, Instance>;
export type FindBy<Arguments extends Array<unknown>> = QueryMethod<
	[Arguments[0], Arguments[1]?, WaitForOptions?],
	Promise<Instance>
>;

export type BuiltQueryMethods<Arguments extends Array<unknown>> = [
	QueryBy<Arguments>,
	GetAllBy<Arguments>,
	GetBy<Arguments>,
	FindAllBy<Arguments>,
	FindBy<Arguments>,
];

export function buildQueries<Arguments extends Array<unknown>>(
	queryAllBy: GetAllBy<Arguments>,
	getMultipleError: GetErrorFunction<Arguments>,
	getMissingError: GetErrorFunction<Arguments>,
): BuiltQueryMethods<Arguments>;
