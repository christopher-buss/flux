import type { Except } from "type-fest";

import type { BoundFunction, prettyFormat, Queries } from "../dom-testing-library-lua";
import type * as queries from "../dom-testing-library-lua/types/queries";
import type Act from "./types/act";

export * from "../dom-testing-library-lua";

/**
 * Result object returned by `render`, providing queries bound to the
 * rendered container plus utilities for interacting with the rendered tree.
 *
 * @template Q - The set of queries bound to the result.
 * @template Container - The container element type.
 * @template BaseElement - The base element type for queries.
 */
export type RenderResult<
	Q extends Queries = typeof queries,
	Container extends Instance = Instance,
	BaseElement extends Instance = Container,
> = {
	/** The base element used for queries and debug output. */
	baseElement: BaseElement;
	/** The container element the component was rendered into. */
	container: Container;
	/**
	 * Pretty-print the rendered DOM tree for debugging.
	 *
	 * @param baseElement - Element(s) to print. Defaults to the rendered tree.
	 * @param maxLength - Maximum output length.
	 * @param options - Pretty-format options.
	 */
	debug: (
		baseElement?: Array<Instance> | Instance,
		maxLength?: number,
		options?: prettyFormat.OptionsReceived,
	) => void;
	/**
	 * Re-render the component with new props.
	 *
	 * @param ui - The updated React element to render.
	 */
	rerender: (ui: React.ReactElement) => void;
	/** Unmount the rendered component and clean up. */
	unmount: () => void;
} & { [P in keyof Q]: BoundFunction<Q[P]> };

/**
 * Options for the `render` function.
 *
 * @template Q - The set of queries to bind.
 * @template Container - The container element type.
 * @template BaseElement - The base element type for queries.
 */
export interface RenderOptions<
	Q extends Queries = typeof queries,
	Container extends Instance = Instance,
	BaseElement extends Instance = Container,
> {
	/**
	 * Defaults to the container if the container is specified. Otherwise
	 * `document.body` is used for the default. This is used as the base element
	 * for the queries as well as what is printed when you use `debug()`.
	 *
	 * @see https://testing-library.com/docs/react-testing-library/api/#baseelement
	 */
	baseElement?: BaseElement;
	/**
	 * By default, React Testing Library will create a div and append that div
	 * to the document.body. Your React component will be rendered in the
	 * created div. If you provide your own HTMLElement container via this
	 * option, it will not be appended to the document.body automatically.
	 *
	 * For example: If you are unit testing a `<tbody>` element, it cannot be a
	 * child of a div. In this case, you can specify a table as the render
	 * container.
	 *
	 * @see https://testing-library.com/docs/react-testing-library/api/#container
	 */
	container?: Container;
	/**
	 * Queries to bind. Overrides the default set from DOM Testing Library
	 * unless merged.
	 *
	 * @see https://testing-library.com/docs/react-testing-library/api/#queries
	 */
	queries?: Q;
	/**
	 * Pass a React Component as the wrapper option to have it rendered around
	 * the inner element. This is most useful for creating reusable custom
	 * render functions for common data providers. See setup for examples.
	 *
	 * @see https://testing-library.com/docs/react-testing-library/api/#wrapper
	 */
	wrapper?: React.JSXElementConstructor<{
		/** The children elements to wrap. */
		children: React.ReactElement;
	}>;
}

/**
 * Render a React element into a container appended to document.body.
 * Should be used with `cleanup`.
 *
 * @template Q - The set of queries to bind.
 * @template Container - The container element type.
 * @template BaseElement - The base element type for queries.
 * @param ui - The React element to render.
 * @param options - Render options including container, queries, and wrapper.
 * @returns A result object with bound queries and utilities.
 */
export function render<
	Q extends Queries = typeof queries,
	Container extends Instance = Instance,
	BaseElement extends Instance = Container,
>(
	ui: React.ReactElement,
	options: RenderOptions<Q, Container, BaseElement>,
): RenderResult<Q, Container, BaseElement>;
export function render(
	ui: React.ReactElement,
	options?: Except<RenderOptions, "queries">,
): RenderResult;

/** Unmounts React trees that were mounted with render. */
export function cleanup(): void;

/**
 * Simply calls ReactDOMTestUtils.act(cb) If that's not available (older version
 * of react) then it simply calls the given callback immediately.
 */
export const act: typeof Act;
