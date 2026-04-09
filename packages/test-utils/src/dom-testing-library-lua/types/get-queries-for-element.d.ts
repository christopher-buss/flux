/* oxlint-disable small-rules/no-shorthand-names -- cannot do anything dude */
// oxlint-disable-next-line import/no-namespace
import type * as queries from "./queries";
import type { Error } from "./stub";

export type BoundFunction<T> = T extends (container: Instance, ...args: infer P) => infer R
	? (this: void, ...args: P) => R
	: never;

export type BoundFunctions<Q> = Q extends typeof queries
	? {
			[P in keyof Q]: BoundFunction<Q[P]>;
		} & {
			findAllByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindAllByBoundAttribute<T>>>
			): ReturnType<queries.FindAllByBoundAttribute<T>>;
			findAllByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindAllByBoundAttribute<T>>>
			): ReturnType<queries.FindAllByBoundAttribute<T>>;
			findAllByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindAllByBoundAttribute<T>>>
			): ReturnType<queries.FindAllByBoundAttribute<T>>;
			findAllByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindAllByText<T>>>
			): ReturnType<queries.FindAllByText<T>>;
			findByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindByBoundAttribute<T>>>
			): ReturnType<queries.FindByBoundAttribute<T>>;
			findByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindByBoundAttribute<T>>>
			): ReturnType<queries.FindByBoundAttribute<T>>;
			findByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindByBoundAttribute<T>>>
			): ReturnType<queries.FindByBoundAttribute<T>>;
			findByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.FindByText<T>>>
			): ReturnType<queries.FindByText<T>>;
			getAllByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			getAllByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			getAllByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			getAllByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByText<T>>>
			): ReturnType<queries.AllByText<T>>;
			getByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.GetByBoundAttribute<T>>>
			): ReturnType<queries.GetByBoundAttribute<T>>;
			getByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.GetByBoundAttribute<T>>>
			): ReturnType<queries.GetByBoundAttribute<T>>;
			getByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.GetByBoundAttribute<T>>>
			): ReturnType<queries.GetByBoundAttribute<T>>;
			getByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.GetByText<T>>>
			): ReturnType<queries.GetByText<T>>;
			queryAllByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			queryAllByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			queryAllByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByBoundAttribute<T>>>
			): ReturnType<queries.AllByBoundAttribute<T>>;
			queryAllByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.AllByText<T>>>
			): ReturnType<queries.AllByText<T>>;
			queryByDisplayValue<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.QueryByBoundAttribute<T>>>
			): ReturnType<queries.QueryByBoundAttribute<T>>;
			queryByPlaceholderText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.QueryByBoundAttribute<T>>>
			): ReturnType<queries.QueryByBoundAttribute<T>>;
			queryByTestId<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.QueryByBoundAttribute<T>>>
			): ReturnType<queries.QueryByBoundAttribute<T>>;
			queryByText<T extends Instance = Instance>(
				this: void,
				...args: Parameters<BoundFunction<queries.QueryByText<T>>>
			): ReturnType<queries.QueryByText<T>>;
		}
	: {
			[P in keyof Q]: BoundFunction<Q[P]>;
		};

export type Query = (
	container: Instance,
	...args: Array<unknown>
) => Array<Instance> | Error | Instance | Promise<Array<Instance>> | Promise<Instance> | undefined;

export type Queries = Record<string, Query>;

export function getQueriesForElement<
	QueriesToBind extends Queries = typeof queries,
	// Extra type parameter required for reassignment.
	T extends QueriesToBind = QueriesToBind,
>(element: Instance, queriesToBind?: T): BoundFunctions<T>;
