import type { Error } from "./stub";

export interface Config {
	asyncUtilTimeout: number;
	asyncWrapper(callback: (...args: Array<unknown>) => unknown): Promise<unknown>;
	computedStyleSupportsPseudoElements: boolean;
	defaultHidden: boolean;
	/** Default value for the `ignore` option in `ByText` queries. */
	defaultIgnore: string;
	eventWrapper(callback: (...args: Array<unknown>) => unknown): void;
	getElementError: (message: string | undefined, container: Instance) => Error;
	showOriginalStackTrace: boolean;
	testIdAttribute: string;
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

export type ConfigFn = (existingConfig: Config) => Partial<Config>;

export function configure(configDelta: ConfigFn | Partial<Config>): void;
export function getConfig(): Config;
