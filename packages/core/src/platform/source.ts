import type { InputPlatform } from "../bindings/classify";

/** Notified when the current input platform changes. */
export type InputPlatformListener = (platform: InputPlatform) => void;

/**
 * Where a platform signal reads the player's device from.
 *
 * The seam between the platform rules — override precedence, change
 * de-duplication, watcher lifetime — and the engine call that answers "what is
 * this player holding". Production supplies `engineInputSource`; a test
 * supplies a device it can drive.
 */
export interface InputPlatformSource {
	/**
	 * Reads the platform of the player's device.
	 * @returns The platform, or `undefined` where there is no device to read —
	 * off the client, `UserInputService` has no player to answer for.
	 */
	readonly find: () => InputPlatform | undefined;

	/**
	 * Watches the device for platform changes.
	 * @param onChanged - Called each time the device may have changed.
	 * @returns A disconnect function, or `undefined` where there is nothing to
	 * watch.
	 */
	readonly watch: (onChanged: () => void) => (() => void) | undefined;
}
