import type { getQueriesForElement } from "./get-queries-for-element";

export declare const within: typeof getQueriesForElement;

// Re-export config functions
export { configure, getConfig } from "./config";

// Re-export config types
export type { Config, ConfigFunc } from "./config";

// Re-export fireEvent const
export { fireEvent } from "./events";

// Re-export event types
export type { EventType, FireFunction, FireObject } from "./events";

// Re-export getNodeText function
export { getNodeText } from "./get-node-text";

// Re-export getQueriesForElement function
export { getQueriesForElement } from "./get-queries-for-element";

// Re-export element query types
export type { BoundFunction, BoundFunctions, Query, Queries } from "./get-queries-for-element";
// Re-export normalizer function
export { getDefaultNormalizer } from "./matches";

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
} from "./matches";

// Re-export pretty-dom functions
export { prettyDOM, logDOM, prettyFormat } from "./pretty-dom";

// Re-export pretty-dom type
export type { PrettyDOMOptions } from "./pretty-dom";

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
} from "./queries";

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
} from "./queries";

// Re-export query helper functions
export { buildQueries, queryByAttribute, queryAllByAttribute } from "./query-helpers";

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
} from "./query-helpers";

// Re-export screen const
export { screen } from "./screen";

// Re-export screen type
export type { Screen } from "./screen";

// Re-export suggestion function
export { getSuggestedQuery } from "./suggestions";

// Re-export suggestion types
export type { QueryOptions, QueryArgs, Suggestion, Variant, Method } from "./suggestions";

// Re-export wait functions
export { waitFor } from "./wait-for";

// Re-export wait types
export type { WaitForOptions as waitForOptions } from "./wait-for";

export { waitForElementToBeRemoved } from "./wait-for-element-to-be-removed";
