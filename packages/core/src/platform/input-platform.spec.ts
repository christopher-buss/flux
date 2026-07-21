import { describe, expect, it, jest } from "@rbxts/jest-globals";

import type { InputPlatform } from "../bindings/classify";
import { createInputPlatformSignal } from "./input-platform";
import type { InputPlatformSource } from "./source";

/** A device a test can drive, standing in for `UserInputService`. */
interface FakeDevice {
	/** Whether the signal currently holds a watcher on the device. */
	readonly isWatched: () => boolean;
	/** Changes the device's platform and notifies the watcher. */
	readonly setPlatform: (platform: InputPlatform) => void;
	/** The source to build a signal over. */
	readonly source: InputPlatformSource;
}

/**
 * Builds a readable, watchable device — what the engine source answers with on
 * a client.
 * @param initial - The platform the device starts on.
 * @returns The device and its controls.
 */
function createDevice(initial: InputPlatform): FakeDevice {
	let platform = initial;
	let notify: (() => void) | undefined;

	return {
		isWatched: () => notify !== undefined,
		setPlatform: (updated) => {
			platform = updated;
			notify?.();
		},
		source: {
			find: () => platform,
			watch: (onChanged) => {
				notify = onChanged;
				return () => {
					notify = undefined;
				};
			},
		},
	};
}

/**
 * Builds a source with no device behind it — what the engine source answers
 * with off the client.
 * @returns A source that knows nothing and cannot be watched.
 */
function createHeadlessSource(): InputPlatformSource {
	return {
		find: () => {},
		watch: () => {},
	};
}

describe("getInputPlatform", () => {
	it("should report the device's platform", () => {
		expect.assertions(1);

		const signal = createInputPlatformSignal(createDevice("gamepad").source);

		expect(signal.getInputPlatform()).toBe("gamepad");
	});

	it("should report the override in preference to the device", () => {
		expect.assertions(1);

		const signal = createInputPlatformSignal(createDevice("keyboard").source);
		signal.setInputPlatformOverride("touch");

		expect(signal.getInputPlatform()).toBe("touch");
	});

	it("should throw with no device and no override in force", () => {
		expect.assertions(1);

		const signal = createInputPlatformSignal(createHeadlessSource());

		expect(() => {
			signal.getInputPlatform();
		}).toThrow("client-only");
	});
});

describe("onInputPlatformChanged", () => {
	it("should fire with the new platform when the device changes", () => {
		expect.assertions(1);

		const device = createDevice("keyboard");
		const signal = createInputPlatformSignal(device.source);
		const [listener, onChanged] = jest.fn<(platform: InputPlatform) => void>();
		signal.onInputPlatformChanged(onChanged);

		device.setPlatform("gamepad");

		expect(listener).toHaveBeenCalledWith("gamepad");
	});

	it("should stay silent while an override is in force", () => {
		expect.assertions(1);

		const device = createDevice("keyboard");
		const signal = createInputPlatformSignal(device.source);
		signal.setInputPlatformOverride("touch");
		const [listener, onChanged] = jest.fn<(platform: InputPlatform) => void>();
		signal.onInputPlatformChanged(onChanged);

		device.setPlatform("gamepad");

		expect(listener).never.toHaveBeenCalled();
	});

	it("should fire once when a cleared override disagrees with the device", () => {
		expect.assertions(2);

		const signal = createInputPlatformSignal(createDevice("gamepad").source);
		signal.setInputPlatformOverride("touch");
		const [listener, onChanged] = jest.fn<(platform: InputPlatform) => void>();
		signal.onInputPlatformChanged(onChanged);

		signal.setInputPlatformOverride(undefined);

		expect(listener).toHaveBeenCalledOnce();
		expect(listener).toHaveBeenCalledWith("gamepad");
	});

	it("should stay silent when an override matches the current platform", () => {
		expect.assertions(1);

		const signal = createInputPlatformSignal(createDevice("gamepad").source);
		const [listener, onChanged] = jest.fn<(platform: InputPlatform) => void>();
		signal.onInputPlatformChanged(onChanged);

		signal.setInputPlatformOverride("gamepad");

		expect(listener).never.toHaveBeenCalled();
	});

	it("should stop delivering after disconnect", () => {
		expect.assertions(1);

		const device = createDevice("keyboard");
		const signal = createInputPlatformSignal(device.source);
		const [listener, onChanged] = jest.fn<(platform: InputPlatform) => void>();
		const disconnect = signal.onInputPlatformChanged(onChanged);

		disconnect();
		device.setPlatform("gamepad");

		expect(listener).never.toHaveBeenCalled();
	});

	it("should watch the device until the last listener leaves", () => {
		expect.assertions(2);

		const device = createDevice("keyboard");
		const signal = createInputPlatformSignal(device.source);
		const first = signal.onInputPlatformChanged(() => {});
		const second = signal.onInputPlatformChanged(() => {});

		first();

		expect(device.isWatched()).toBeTrue();

		second();

		expect(device.isWatched()).toBeFalse();
	});

	it("should deliver override changes with no device behind it", () => {
		expect.assertions(2);

		const signal = createInputPlatformSignal(createHeadlessSource());
		const [listener, onChanged] = jest.fn<(platform: InputPlatform) => void>();
		signal.onInputPlatformChanged(onChanged);

		signal.setInputPlatformOverride("gamepad");

		expect(listener).toHaveBeenCalledWith("gamepad");

		signal.setInputPlatformOverride(undefined);

		expect(listener).toHaveBeenCalledOnce();
	});
});
