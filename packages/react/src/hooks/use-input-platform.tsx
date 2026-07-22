import type { InputPlatform } from "@rbxts/flux";
import { getInputPlatform, onInputPlatformChanged } from "@rbxts/flux";

import { useSyncExternalStore } from "../use-sync-external-store";

/**
 * - Subscribes to the platform the player is currently using.
 * - Re-renders only when the platform actually changes, so a component can
 *   mount and unmount whole forked surfaces on it.
 *
 * Needs no `FluxProvider`: the platform is a property of the client, not of a
 * core or a handle. Pass it to `useBindings` to read the bindings for whatever
 * the player is holding right now.
 *
 * @returns The current input platform.
 * @throws Off the client with no platform override in force — see
 * `getInputPlatform`.
 * @example
 * ```tsx
 * function JumpPrompt(): React.ReactNode {
 *   const platform = useInputPlatform();
 *   const bindings = useBindings("jump", platform);
 *   return <Glyph binding={bindings[0]} />;
 * }
 * ```
 */
export function useInputPlatform(): InputPlatform {
	// The platform is a plain enum value, so the module-level reader is already
	// reference-cached and needs no snapshot cache in front of it.
	return useSyncExternalStore(onInputPlatformChanged, getInputPlatform);
}
