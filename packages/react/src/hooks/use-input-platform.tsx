import type { InputPlatform } from "@rbxts/flux";
import { getInputPlatform, onInputPlatformChanged } from "@rbxts/flux";
import { useEffect, useRef, useState } from "@rbxts/react";

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
	const [platform, setPlatform] = useState(getInputPlatform);
	// Mirrors the rendered value so a change can be compared against it without
	// re-rendering. Every write to `setPlatform` updates it first, so it needs
	// no effect of its own to stay in step.
	const lastValueRef = useRef(platform);

	useEffect(() => {
		function publishIfChanged(updated: InputPlatform): void {
			if (lastValueRef.current === updated) {
				return;
			}

			lastValueRef.current = updated;
			setPlatform(updated);
		}

		// Catches a flip landing between the initial render and this effect.
		publishIfChanged(getInputPlatform());

		return onInputPlatformChanged(publishIfChanged);
	}, []);

	return platform;
}
