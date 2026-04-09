import type { OptionsReceived } from "@rbxts/pretty-format";

export interface PrettyDOMOptions extends OptionsReceived {
	/**
	 * Given a `Instance` return `false` if you wish to ignore that node in the
	 * output. By default, ignores `<style />`, `<script />` and comment nodes.
	 */
	filterNode?: (node: Instance) => boolean;
}

export function prettyDOM(dom?: Instance, maxLength?: number, options?: PrettyDOMOptions): false | string;

export function logDOM(dom?: Instance, maxLength?: number, options?: PrettyDOMOptions): void;

export * as prettyFormat from "@rbxts/pretty-format";
