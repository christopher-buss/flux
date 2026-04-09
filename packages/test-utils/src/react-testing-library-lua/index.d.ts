import type { Except } from "type-fest";

import type { BoundFunction, prettyFormat, Queries } from "../dom-testing-library-lua";
import type * as queries from "../dom-testing-library-lua/types/queries";
import type Act from "./types/act";

export * from "../dom-testing-library-lua";

export type RenderResult<
	Q extends Queries = typeof queries,
	Container extends Instance = Instance,
	BaseElement extends Instance = Container,
> = { [P in keyof Q]: BoundFunction<Q[P]> } & {
	baseElement: BaseElement;
	container: Container;
	debug: (
		baseElement?: Array<Instance> | Instance,
		maxLength?: number,
		options?: prettyFormat.OptionsReceived,
	) => void;
	rerender: (ui: React.ReactElement) => void;
	unmount: () => void;
};

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
	wrapper?: React.JSXElementConstructor<{ children: React.ReactElement }>;
}

/**
 * Render into a container which is appended to document.body. It should be used
 * with cleanup.
 */
export function render<
	Q extends Queries = typeof queries,
	Container extends Instance = Instance,
	BaseElement extends Instance = Container,
>(ui: React.ReactElement, options: RenderOptions<Q, Container, BaseElement>): RenderResult<Q, Container, BaseElement>;
export function render(ui: React.ReactElement, options?: Except<RenderOptions, "queries">): RenderResult;

/** Unmounts React trees that were mounted with render. */
export function cleanup(): void;

/**
 * Simply calls ReactDOMTestUtils.act(cb) If that's not available (older version
 * of react) then it simply calls the given callback immediately.
 */
export const act: typeof Act;
