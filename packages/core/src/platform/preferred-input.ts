import type { InputPlatform } from "../bindings/classify";

/**
 * Maps the engine's `PreferredInput` onto a platform.
 *
 * `PreferredInput` is the engine's own curated answer to "what should the UI
 * present for", so it is read straight across rather than derived from raw
 * input events.
 * @param preferred - The engine's preferred input.
 * @returns The matching platform. A member this mapping does not name reports
 * `"keyboard"` — an arbitrary but stable answer, the same way `classifyBinding`
 * answers for a binding it cannot place.
 * @example
 * mapPreferredInput(Enum.PreferredInput.Gamepad) // → "gamepad"
 */
export function mapPreferredInput(preferred: Enum.PreferredInput): InputPlatform {
	if (preferred === Enum.PreferredInput.Gamepad) {
		return "gamepad";
	}

	if (preferred === Enum.PreferredInput.Touch) {
		return "touch";
	}

	return "keyboard";
}
