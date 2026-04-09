import type { RegExp } from "./stub";

export type QueryOptions = Record<string, boolean | RegExp>;

export type QueryArgs = [string, QueryOptions?];

export interface Suggestion {
	queryArgs: QueryArgs;
	queryMethod: string;
	queryName: string;
	toString(): string;
	variant: string;
	warning?: string;
}

export type Variant = "find" | "findAll" | "get" | "getAll" | "query" | "queryAll";

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

export function getSuggestedQuery(element: Instance, variant?: Variant, method?: Method): Suggestion | undefined;
