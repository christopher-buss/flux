import type { getQueriesForElement } from "./types/get-queries-for-element";

export declare const within: typeof getQueriesForElement;

// Re-export config functions
export { configure, getConfig } from "./types/config";

// Re-export config types
export type { Config, ConfigFunc } from "./types/config";

// Re-export fireEvent const
export { fireEvent } from "./types/events";

// Re-export event types
export type { EventType, FireFunction, FireObject } from "./types/events";

// Re-export getNodeText function
export { getNodeText } from "./types/get-node-text";

// Re-export getQueriesForElement function
export { getQueriesForElement } from "./types/get-queries-for-element";

// Re-export element query types
export type {
	BoundFunction,
	BoundFunctions,
	Query,
	Queries,
} from "./types/get-queries-for-element";
// Re-export normalizer function
export { getDefaultNormalizer } from "./types/matches";

// Re-export matcher types
export type {
	MatcherFunction,
	Matcher,
	ByRoleMatcher,
	NormalizerFunc,
	NormalizerOptions,
	MatcherOptions,
	Match,
	DefaultNormalizerOptions,
} from "./types/matches";

// Re-export pretty-dom functions
export { prettyDOM, logDOM, prettyFormat } from "./types/pretty-dom";

// Re-export pretty-dom type
export type { PrettyDOMOptions } from "./types/pretty-dom";

// Re-export all query functions as values
export {
	getByPlaceholderText,
	getAllByPlaceholderText,
	queryByPlaceholderText,
	queryAllByPlaceholderText,
	findByPlaceholderText,
	findAllByPlaceholderText,
	getByText,
	getAllByText,
	queryByText,
	queryAllByText,
	findByText,
	findAllByText,
	getByDisplayValue,
	getAllByDisplayValue,
	queryByDisplayValue,
	queryAllByDisplayValue,
	findByDisplayValue,
	findAllByDisplayValue,
	getByTestId,
	getAllByTestId,
	queryByTestId,
	queryAllByTestId,
	findByTestId,
	findAllByTestId,
} from "./types/queries";

// Re-export query types
export type {
	QueryByBoundAttribute,
	AllByBoundAttribute,
	FindAllByBoundAttribute,
	GetByBoundAttribute,
	FindByBoundAttribute,
	QueryByText,
	AllByText,
	FindAllByText,
	GetByText,
	FindByText,
} from "./types/queries";

// Re-export query helper functions
export { buildQueries, queryByAttribute, queryAllByAttribute } from "./types/query-helpers";

// Re-export query helper types
export type {
	WithSuggest,
	GetErrorFunction,
	SelectorMatcherOptions,
	QueryByAttribute,
	AllByAttribute,
	getElementError,
	QueryMethod,
	QueryBy,
	GetAllBy,
	FindAllBy,
	GetBy,
	FindBy,
	BuiltQueryMethods,
} from "./types/query-helpers";

// Re-export screen const
export { screen } from "./types/screen";

// Re-export screen type
export type { Screen } from "./types/screen";

// Re-export suggestion function
export { getSuggestedQuery } from "./types/suggestions";

// Re-export suggestion types
export type { QueryOptions, QueryArgs, Suggestion, Variant, Method } from "./types/suggestions";

// Re-export wait functions
export { waitFor } from "./types/wait-for";

// Re-export wait types
export type { WaitForOptions as waitForOptions } from "./types/wait-for";

export { waitForElementToBeRemoved } from "./types/wait-for-element-to-be-removed";
