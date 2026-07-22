import type { ContextConfig } from "../types/contexts";
import type { InputInstanceData } from "./input-instances";
import { INPUT_FOLDER_NAME } from "./input-instances";

/**
 * Finds an already-created `InputContext` instance for a context name under
 * the handle's parent, if the hierarchy already holds one.
 * @param contextName - The context to look for.
 * @param data - The handle's input instance data.
 * @returns The existing `InputContext`, or `undefined` when there is none.
 */
export function findExistingContext(
	contextName: string,
	data: InputInstanceData,
): InputContext | undefined {
	const folder = data.parent.FindFirstChild(INPUT_FOLDER_NAME);
	if (folder === undefined || !classIs(folder, "Folder")) {
		return undefined;
	}

	const existing = folder.FindFirstChild(contextName);
	if (existing !== undefined && classIs(existing, "InputContext")) {
		return existing;
	}

	return undefined;
}

/**
 * Throws if a context name is not declared in the core's context config.
 *
 * Hands back the config it looked up, so a caller that needs it does not repeat
 * the lookup only to re-narrow a type the check already settled.
 * @param contexts - The core's context config record.
 * @param name - The context name to validate.
 * @returns That context's config.
 * @throws If the context is unknown.
 */
export function validateContextName(
	contexts: Record<string, ContextConfig>,
	name: string,
): ContextConfig {
	const contextConfig = contexts[name];
	if (contextConfig === undefined) {
		error(`unknown context: ${name}`);
	}

	return contextConfig;
}

/**
 * Validates every context name in a list.
 * @template Name - The context name literal type.
 * @param contexts - The core's context config record.
 * @param names - The context names to validate.
 * @returns The same list, once every name is known.
 * @throws If any context is unknown.
 */
export function validateContextNames<Name extends string>(
	contexts: Record<string, ContextConfig>,
	names: ReadonlyArray<Name>,
): ReadonlyArray<Name> {
	for (const name of names) {
		validateContextName(contexts, name);
	}

	return names;
}
