import type { InputPlatform } from "../bindings/classify";
import { engineInputSource } from "./engine-source";
import type { InputPlatformListener, InputPlatformSource } from "./source";

/** The reads and writes one input platform signal offers. */
export interface InputPlatformSignal {
	/** See {@link getInputPlatform}. */
	readonly getInputPlatform: () => InputPlatform;
	/** See {@link onInputPlatformChanged}. */
	readonly onInputPlatformChanged: (listener: InputPlatformListener) => () => void;
	/** See {@link setInputPlatformOverride}. */
	readonly setInputPlatformOverride: (platform: InputPlatform | undefined) => void;
}

/**
 * Builds an input platform signal over a device source.
 *
 * Every rule the signal enforces lives here rather than in the source, so a
 * test driving a fake device exercises the same override precedence and
 * change de-duplication production runs.
 * @param source - Where the player's device is read from.
 * @returns The signal's reads and writes.
 */
// eslint-disable-next-line max-lines-per-function -- one closure per exported verb
export function createInputPlatformSignal(source: InputPlatformSource): InputPlatformSignal {
	const listeners = new Set<InputPlatformListener>();

	/** The platform every reader is told about, whatever the device says. */
	let override: InputPlatform | undefined;

	/** Releases the device watcher; present only while someone is subscribed. */
	let unwatch: (() => void) | undefined;

	/**
	 * The platform subscribers have already been told about, so a change fires
	 * once and a non-change fires not at all.
	 *
	 * `undefined` where no device is readable and no override is in force — the
	 * platform is genuinely unknowable there, so the first one to become known
	 * is news.
	 */
	let published: InputPlatform | undefined;

	/**
	 * Resolves the current platform, if it can be known.
	 *
	 * The one place the override outranks the device, so every entry point
	 * agrees about what is being overridden.
	 * @returns The current platform, or `undefined` when nothing knows it.
	 */
	function findInputPlatform(): InputPlatform | undefined {
		return override ?? source.find();
	}

	/**
	 * Notifies subscribers when, and only when, the platform actually changed.
	 *
	 * The single path both the device watcher and `setInputPlatformOverride`
	 * publish through, so neither can fire a change the other would call a
	 * non-change.
	 */
	function publish(): void {
		const current = findInputPlatform();
		if (current === undefined || current === published) {
			return;
		}

		published = current;
		for (const listener of listeners) {
			listener(current);
		}
	}

	function getInputPlatform(): InputPlatform {
		const platform = findInputPlatform();
		assert(
			platform !== undefined,
			"getInputPlatform is client-only; call setInputPlatformOverride to read one elsewhere",
		);

		return platform;
	}

	function onInputPlatformChanged(listener: InputPlatformListener): () => void {
		if (listeners.isEmpty()) {
			// Recorded for the first listener only, so a later subscriber
			// cannot reset it out from under the ones already listening.
			published = findInputPlatform();
			unwatch = source.watch(publish);
		}

		listeners.add(listener);

		return () => {
			listeners.delete(listener);
			if (listeners.isEmpty()) {
				unwatch?.();
				unwatch = undefined;
			}
		};
	}

	function setInputPlatformOverride(platform: InputPlatform | undefined): void {
		override = platform;
		publish();
	}

	return { getInputPlatform, onInputPlatformChanged, setInputPlatformOverride };
}

const shared = createInputPlatformSignal(engineInputSource);

/**
 * Reports the input platform the player is currently using.
 *
 * Reads `UserInputService.PreferredInput`, the engine's own curated answer to
 * "what should the UI present for", rather than tracking raw input events.
 *
 * An override takes precedence over the device, so a forced platform reaches
 * every reader — this function, {@link onInputPlatformChanged}, and anything
 * built on them — rather than only the one that set it.
 * @returns The current platform.
 * @throws Off the client with no override in force. The platform is a property
 * of a player's device, so a server read has no truthful answer, and a
 * plausible one would silently pick the wrong glyphs.
 * @example
 * getInputPlatform(); // → "gamepad", with a pad in hand
 */
export const { getInputPlatform } = shared;

/**
 * Subscribes to changes of the current input platform.
 *
 * Fires only on a real change of the value {@link getInputPlatform} reports, so
 * a `PreferredInput` flip underneath an override is silent, and clearing an
 * override that disagrees with the device fires once. No debounce:
 * `PreferredInput` is already curated by the engine.
 *
 * Subscribing is passive and never throws. Off the client there is nothing to
 * watch, so a listener there hears override changes only.
 * @param listener - Called with the new platform each time it changes.
 * @returns A disconnect function. Disconnecting the last listener releases the
 * engine connection.
 * @example
 * const disconnect = onInputPlatformChanged((platform) => {
 *   glyphs.setPlatform(platform);
 * });
 */
export const { onInputPlatformChanged } = shared;

/**
 * Forces the platform every reader sees, or releases it back to the engine.
 *
 * The seam behind a Studio "force gamepad" toggle and behind tests. It is
 * deliberately not React-local state: a toggle that only convinced the React
 * tree would leave every other consumer reading the real device.
 * @param platform - The platform to force, or `undefined` to follow the device
 * again.
 * @example
 * setInputPlatformOverride("touch"); // every reader now reports touch
 * setInputPlatformOverride(undefined); // back to the device
 */
export const { setInputPlatformOverride } = shared;
