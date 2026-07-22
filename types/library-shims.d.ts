/**
 * Type-only stubs for standard-lib names that `noLib` removes.
 *
 * Full-lib type packages (such as type-fest) reference these names; when
 * unresolved they become error types and evaluation silently collapses to `any`
 * (type-fest's `PartialDeep`, for example). Aliasing them to `never` makes the
 * names resolve while staying unusable in our own code, and the `@deprecated`
 * tags let lint reject any reference.
 */

/** @deprecated Does not exist on Roblox - use `DateTime` or `os.time`. */
type Date = never;

/** @deprecated Does not exist on Roblox - use `string.match` or `@rbxts/regexp`. */
type RegExp = never;

/** @deprecated Does not exist on Roblox. */
type WeakKey = object;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type Int8Array = never;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type Uint8Array = never;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type Uint8ClampedArray = never;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type Int16Array = never;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type Uint16Array = never;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type Int32Array = never;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type Uint32Array = never;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type Float16Array = never;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type Float32Array = never;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type Float64Array = never;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type BigInt64Array = never;

/** @deprecated Does not exist on Roblox - use `buffer`. */
type BigUint64Array = never;

/**
 * The set of key types allowed by `keyof`. Genuinely correct under roblox-ts,
 * so it is not deprecated.
 */
type PropertyKey = number | string | symbol;
