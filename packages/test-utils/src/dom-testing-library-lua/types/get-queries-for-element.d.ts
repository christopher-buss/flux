import type * as queries from "./queries";
import type { Error } from "./stub";

/**
 * Binds a query function to a container, removing the container parameter.
 *
 * @template T - The original query function type.
 */
export type BoundFunction<T> = T extends (container: Instance, ...args: infer P) => infer R
	? (this: void, ...args: P) => R
	: never;

/**
 * Map of query names to their container-bound variants.
 *
 * @template Q - The queries object to bind.
 */
export type BoundFunctions<Q> = Q extends typeof queries
	? {
			/** Find all elements matching a display value. */
			findAllByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindAllByBoundAttribute<T>>>
			): ReturnType<queries.FindAllByBoundAttribute<T>>;
			/** Find all elements matching placeholder text. */
			findAllByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindAllByBoundAttribute<T>>>
			): ReturnType<queries.FindAllByBoundAttribute<T>>;
			/** Find all elements matching a test ID. */
			findAllByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindAllByBoundAttribute<T>>>
			): ReturnType<queries.FindAllByBoundAttribute<T>>;
			/** Find all elements matching text content. */
			findAllByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindAllByText<T>>>
			): ReturnType<queries.FindAllByText<T>>;
			/** Find a single element matching a display value. */
			findByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindByBoundAttribute<T>>>
			): ReturnType<queries.FindByBoundAttribute<T>>;
			/** Find a single element matching placeholder text. */
			findByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindByBoundAttribute<T>>>
			): ReturnType<queries.FindByBoundAttribute<T>>;
			/** Find a single element matching a test ID. */
			findByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindByBoundAttribute<T>>>
			): ReturnType<queries.FindByBoundAttribute<T>>;
			/** Find a single element matching text content. */
			findByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindByText<T>>>
			): ReturnType<queries.FindByText<T>>;
			/** Get all elements matching a display value, throwing if none found. */
			getAllByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			/** Get all elements matching placeholder text, throwing if none found. */
			getAllByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			/** Get all elements matching a test ID, throwing if none found. */
			getAllByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			/** Get all elements matching text content, throwing if none found. */
			getAllByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByText<T>>>
			): ReturnType<queries.AllByText<T>>;
			/** Get a single element by display value, throwing if not found or ambiguous. */
			getByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.GetByBoundAttribute<T>>>
			): ReturnType<queries.GetByBoundAttribute<T>>;
			/** Get a single element by placeholder text, throwing if not found or ambiguous. */
			getByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.GetByBoundAttribute<T>>>
			): ReturnType<queries.GetByBoundAttribute<T>>;
			/** Get a single element by test ID, throwing if not found or ambiguous. */
			getByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.GetByBoundAttribute<T>>>
			): ReturnType<queries.GetByBoundAttribute<T>>;
			/** Get a single element by text content, throwing if not found or ambiguous. */
			getByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.GetByText<T>>>
			): ReturnType<queries.GetByText<T>>;
			/** Query all elements matching a display value, returning empty array if none. */
			queryAllByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			/** Query all elements matching placeholder text, returning empty array if none. */
			queryAllByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			/** Query all elements matching a test ID, returning empty array if none. */
			queryAllByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			/** Query all elements matching text content, returning empty array if none. */
			queryAllByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByText<T>>>
			): ReturnType<queries.AllByText<T>>;
			/** Query a single element by display value, returning undefined if not found. */
			queryByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.QueryByBoundAttribute<T>>>
			): ReturnType<queries.QueryByBoundAttribute<T>>;
			/** Query a single element by placeholder text, returning undefined if not found. */
			queryByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.QueryByBoundAttribute<T>>>
			): ReturnType<queries.QueryByBoundAttribute<T>>;
			/** Query a single element by test ID, returning undefined if not found. */
			queryByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.QueryByBoundAttribute<T>>>
			): ReturnType<queries.QueryByBoundAttribute<T>>;
			/** Query a single element by text content, returning undefined if not found. */
			queryByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.QueryByText<T>>>
			): ReturnType<queries.QueryByText<T>>;
		} & {
			[P in keyof Q]: BoundFunction<Q[P]>;
		}
	: {
			[P in keyof Q]: BoundFunction<Q[P]>;
		};

/**
 * Union type for any query function signature.
 *
 * @param container - The root element to search within.
 * @param args - Query-specific arguments.
 */
export type Query = (
	container: Instance,
	...args: Array<unknown>
) => Array<Instance> | Error | Instance | Promise<Array<Instance>> | Promise<Instance> | undefined;

/** Record of named query functions. */
export type Queries = Record<string, Query>;

/**
 * Bind a set of queries to a specific container element.
 *
 * @template QueriesToBind - The queries object type to bind.
 * @template T - Resolved queries type.
 * @param element - The container element to bind queries to.
 * @param queriesToBind - Optional custom queries to bind instead of defaults.
 * @returns An object of container-bound query functions.
 */
export function getQueriesForElement<
	QueriesToBind extends Queries = typeof queries,
	// Extra type parameter required for reassignment.
	T extends QueriesToBind = QueriesToBind,
>(element: Instance, queriesToBind?: T): BoundFunctions<T>;
