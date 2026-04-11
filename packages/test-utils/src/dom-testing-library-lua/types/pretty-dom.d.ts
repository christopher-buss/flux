import type { OptionsReceived } from "@rbxts/pretty-format";

/** Options for `prettyDOM`, extending pretty-format options with a node filter. */
export interface PrettyDOMOptions extends OptionsReceived {
	/**
	 * Given a `Instance` return `false` if you wish to ignore that node in the
	 * output. By default, ignores `<style />`, `<script />` and comment nodes.
	 */
	filterNode?: (node: Instance) => boolean;
}

/**
 * Return a formatted string representation of the DOM tree.
 *
 * @param dom - The root element to format.
 * @param maxLength - Maximum output length before truncation.
 * @param options - Pretty-format and filtering options.
 * @returns The formatted string, or `false` if the output exceeds maxLength.
 */
export function prettyDOM(
	dom?: Instance,
	maxLength?: number,
	options?: PrettyDOMOptions,
): false | string;

/**
 * Log a formatted representation of the DOM tree to the console.
 *
 * @param dom - The root element to format.
 * @param maxLength - Maximum output length before truncation.
 * @param options - Pretty-format and filtering options.
 */
export function logDOM(dom?: Instance, maxLength?: number, options?: PrettyDOMOptions): void;

export * as prettyFormat from "@rbxts/pretty-format";
