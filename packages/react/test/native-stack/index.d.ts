import type ReactNamespace from "@rbxts/react";
import type ReactRobloxNamespace from "@rbxts/react-roblox";

import type { StoreHook } from "#src/use-sync-external-store";

/**
 * The react-lua the patches under `patches/` produce: everything the stock one
 * has, plus the hook Roblox/react-luau#24 backports.
 */
export type NativeReact = typeof ReactNamespace & {
	/** React's own store hook, which the stock react-lua does not ship. */
	readonly useSyncExternalStore: StoreHook;
};

/**
 * The patched React, mounted beside the stock one rather than replacing it.
 *
 * Its hooks only work inside a tree rendered by {@link ReactRoblox} below —
 * `ReactCurrentDispatcher` lives in each stack's own `shared` copy, so a
 * component mixing the two throws.
 */
export declare const React: NativeReact;

/** The renderer bound to {@link React}. Use its `act`, not the stock one. */
export declare const ReactRoblox: typeof ReactRobloxNamespace;

/**
 * `@rbxts/flux-react`'s public surface, compiled once and mounted here, so it
 * resolves `@rbxts/react` to {@link React} instead of the stock one.
 */
export declare const FluxReact: typeof import("#src/index");

/**
 * The same store-hook module the stock tree loads, resolved against
 * {@link React} — so its `useSyncExternalStore` is React's own rather than the
 * shim.
 */
export declare const StoreHook: typeof import("#src/use-sync-external-store");
