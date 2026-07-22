import type { ContextConfig } from "../types/contexts";

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
 * Looks up a context config core itself is already carrying the name of.
 *
 * The internal-invariant flavour of {@link validateContextName}: that one
 * validates a name a caller supplied, at the API boundary, and reports it as a
 * recoverable mistake. This one states that a name core is holding — an active
 * context, a registered context — must have a config, and is unreachable
 * unless core state has gone inconsistent. The two stay separate because the
 * distinction is what tells a consumer's typo apart from a core bug.
 * @param contexts - The core's context config record.
 * @param name - The context name to look up.
 * @returns That context's config.
 * @throws If the context has no config, which means core state is inconsistent.
 */
export function requireContextConfig(
	contexts: Record<string, ContextConfig>,
	name: string,
): ContextConfig {
	const contextConfig = contexts[name];
	assert(contextConfig, `missing context config: ${name}`);
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
