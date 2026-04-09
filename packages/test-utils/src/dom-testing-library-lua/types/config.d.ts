import type { Error } from "./stub";

/** Configuration options for DOM Testing Library. */
export interface Config {
	/**
	 * Maximum time in milliseconds for async utilities to wait before
	 * timing out.
	 */
	asyncUtilTimeout: number;
	/**
	 * Wraps async utility callbacks for libraries that need setup or
	 * teardown around async operations.
	 *
	 * @param callback - The async callback to wrap.
	 */
	asyncWrapper(callback: (...args: Array<unknown>) => unknown): Promise<unknown>;
	/** Whether computed style resolution supports pseudo elements. */
	computedStyleSupportsPseudoElements: boolean;
	/**
	 * Whether elements hidden from accessibility are included in query
	 * results by default.
	 */
	defaultHidden: boolean;
	/** Default value for the `ignore` option in `ByText` queries. */
	defaultIgnore: string;
	/**
	 * Wraps event dispatch callbacks for libraries that need setup or
	 * teardown around event dispatching.
	 *
	 * @param callback - The event callback to wrap.
	 */
	eventWrapper(callback: (...args: Array<unknown>) => unknown): void;
	/**
	 * Creates an error for element query failures.
	 *
	 * @param message - The error message, or undefined if none.
	 * @param container - The container element that was queried.
	 */
	getElementError: (message: string | undefined, container: Instance) => Error;
	/** Whether to show the original stack trace when errors are thrown. */
	showOriginalStackTrace: boolean;
	/**
	 * Attribute name used to identify elements for `ByTestId` queries.
	 *
	 * @default "data-testid"
	 */
	testIdAttribute: string;
	/**
	 * Whether to throw suggestions when a query could be replaced with a
	 * more accessible alternative.
	 */
	throwSuggestions: boolean;
	/**
	 * WARNING: `unstable` prefix means this API may change in patch and minor
	 * releases.
	 *
	 * @param callback - The callback to execute within the timer advance
	 *   wrapper.
	 */
	unstable_advanceTimersWrapper(callback: (...args: Array<unknown>) => unknown): unknown;
}

/**
 * Function that receives the existing config and returns partial overrides.
 *
 * @param existingConfig - The current configuration.
 */
export type ConfigFunc = (existingConfig: Config) => Partial<Config>;

/**
 * Update the global configuration. Accepts a partial config object or a
 * function that receives the current config and returns overrides.
 * @param configDelta - A partial config object or updater function.
 */
export function configure(configDelta: ConfigFunc | Partial<Config>): void;

/**
 * Retrieve the current DOM Testing Library configuration.
 *
 * @returns The active configuration object.
 */
export function getConfig(): Config;
