import { classifyBinding } from "../bindings/classify";
import type { InputPlatform } from "../bindings/classify";
import type { BindingLike } from "../types/bindings";

/**
 * One action's binding overrides, bucketed by platform.
 *
 * An absent bucket means that platform still tracks its code-defined default
 * bindings; a present but empty bucket is a deliberate unbind.
 */
export type PlatformOverrides = Map<InputPlatform, ReadonlyArray<BindingLike>>;

/**
 * The order platforms are consulted when composing an action's effective
 * bindings.
 *
 * Composition walks buckets rather than a single authored array, so without a
 * fixed order the resulting binding order would follow Luau table iteration
 * and drift between reloads — visible in any UI that lists bindings
 * positionally. A type test pins this list to every member of
 * {@link InputPlatform}, so adding a platform cannot silently skip it.
 */
export const PLATFORM_ORDER = [
	"keyboard",
	"gamepad",
	"touch",
] as const satisfies ReadonlyArray<InputPlatform>;

/**
 * Groups bindings by the platform each one targets.
 * @param bindings - The bindings to classify.
 * @returns A map from platform to the bindings targeting it, in source order.
 * Platforms with no bindings are absent.
 * @example
 * bucketByPlatform([Enum.KeyCode.Space, Enum.KeyCode.ButtonA])
 * // → Map { keyboard → [Space], gamepad → [ButtonA] }
 */
export function bucketByPlatform(
	bindings: ReadonlyArray<BindingLike>,
): Map<InputPlatform, Array<BindingLike>> {
	const byPlatform = new Map<InputPlatform, Array<BindingLike>>();
	for (const binding of bindings) {
		const platform = classifyBinding(binding);
		const bucket = byPlatform.get(platform);
		if (bucket === undefined) {
			byPlatform.set(platform, [binding]);
		} else {
			bucket.push(binding);
		}
	}

	return byPlatform;
}

/**
 * Composes an action's effective bindings from its per-platform overrides and
 * the bindings the code declares for it.
 *
 * Each platform contributes either its override bucket, when one is present,
 * or the declared bindings that classify to it. Within a platform the source
 * array's order is kept; across platforms {@link PLATFORM_ORDER} decides.
 *
 * The defaults are resolved lazily and read at most once: an action whose
 * every platform is overridden never pays for the lookup, which matters on
 * the read path where `getBindings` would otherwise walk every active context
 * only to discard the result.
 * @param overrides - The action's per-platform buckets, if it has any.
 * @param resolveDefaults - Reads the bindings declared for the action in code.
 * @returns The effective bindings, in a deterministic order.
 * @example
 * // gamepad rebound, keyboard still tracking the default
 * composeBindings(new Map([["gamepad", [Enum.KeyCode.ButtonY]]]), () => [
 *   Enum.KeyCode.Space,
 *   Enum.KeyCode.ButtonA,
 * ])
 * // → [Enum.KeyCode.Space, Enum.KeyCode.ButtonY]
 */
export function composeBindings(
	overrides: PlatformOverrides | undefined,
	resolveDefaults: () => ReadonlyArray<BindingLike>,
): ReadonlyArray<BindingLike> {
	if (overrides === undefined) {
		return resolveDefaults();
	}

	const defaults = needsDefaults(overrides)
		? bucketByPlatform(resolveDefaults())
		: new Map<InputPlatform, Array<BindingLike>>();

	const result = new Array<BindingLike>();
	for (const platform of PLATFORM_ORDER) {
		const bucket = overrides.get(platform) ?? defaults.get(platform);
		if (bucket === undefined) {
			continue;
		}

		for (const binding of bucket) {
			result.push(binding);
		}
	}

	return result;
}

/**
 * Reports whether any platform still falls through to the code-defined
 * defaults.
 * @param overrides - The action's per-platform buckets.
 * @returns `true` when at least one platform has no override bucket.
 */
function needsDefaults(overrides: PlatformOverrides): boolean {
	for (const platform of PLATFORM_ORDER) {
		if (!overrides.has(platform)) {
			return true;
		}
	}

	return false;
}
