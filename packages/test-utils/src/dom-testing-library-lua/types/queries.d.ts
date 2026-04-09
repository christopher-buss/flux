/* oxlint-disable small-rules/no-shorthand-names -- upstream */
import type { Matcher, MatcherOptions } from "./matches";
import type { SelectorMatcherOptions } from "./query-helpers";
import type { WaitForOptions } from "./wait-for";

export type QueryByBoundAttribute<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => T | undefined;

export type AllByBoundAttribute<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => Array<T>;

export type FindAllByBoundAttribute<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
	waitForElementOptions?: WaitForOptions,
) => Promise<Array<T>>;

export type GetByBoundAttribute<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => T;

export type FindByBoundAttribute<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
	waitForElementOptions?: WaitForOptions,
) => Promise<T>;

export type QueryByText<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: SelectorMatcherOptions,
) => T | undefined;

export type AllByText<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: SelectorMatcherOptions,
) => Array<T>;

export type FindAllByText<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: SelectorMatcherOptions,
	waitForElementOptions?: WaitForOptions,
) => Promise<Array<T>>;

export type GetByText<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: SelectorMatcherOptions,
) => T;

export type FindByText<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: SelectorMatcherOptions,
	waitForElementOptions?: WaitForOptions,
) => Promise<T>;

export function getByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>;
export function getAllByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function queryByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>;
export function queryAllByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function findByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>;
export function findAllByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>;
export function getByText<T extends Instance = Instance>(...args: Parameters<GetByText<T>>): ReturnType<GetByText<T>>;
export function getAllByText<T extends Instance = Instance>(
	...args: Parameters<AllByText<T>>
): ReturnType<AllByText<T>>;
export function queryByText<T extends Instance = Instance>(
	...args: Parameters<QueryByText<T>>
): ReturnType<QueryByText<T>>;
export function queryAllByText<T extends Instance = Instance>(
	...args: Parameters<AllByText<T>>
): ReturnType<AllByText<T>>;
export function findByText<T extends Instance = Instance>(
	...args: Parameters<FindByText<T>>
): ReturnType<FindByText<T>>;
export function findAllByText<T extends Instance = Instance>(
	...args: Parameters<FindAllByText<T>>
): ReturnType<FindAllByText<T>>;

export function getByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>;
export function getAllByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function queryByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>;
export function queryAllByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function findByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>;
export function findAllByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>;

export function getByTestId<T extends Instance = Instance>(
	...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>;
export function getAllByTestId<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function queryByTestId<T extends Instance = Instance>(
	...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>;
export function queryAllByTestId<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function findByTestId<T extends Instance = Instance>(
	...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>;
export function findAllByTestId<T extends Instance = Instance>(
	...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>;
