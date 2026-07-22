import { describe, expect, it, jest } from "@rbxts/jest-globals";
import { fromAny, fromPartial } from "@rbxts/jest-utils";

import type { InputPlatformSource } from "./source";

interface EngineStub {
	/** Whether a watcher is currently connected to `PreferredInput`. */
	readonly isWatched: () => boolean;
	/** Changes `PreferredInput` and fires its changed signal. */
	readonly setPreferred: (preferred: Enum.PreferredInput) => void;
	/** The source under test, built against the stubbed services. */
	readonly source: InputPlatformSource;
}

/**
 * Loads `engine-source` against stubbed services.
 *
 * `doMock` rather than a hoisted `mock` because each test needs a different
 * answer from `IsClient`, and `isolateModules` gives the source a fresh module
 * registry so it binds the stubs this call installed.
 * @param options - Whether the stub reports a client, and its starting
 * `PreferredInput`.
 * @returns The loaded source and controls for driving it.
 */
function loadEngineSource(options: {
	isClient: boolean;
	preferred?: Enum.PreferredInput;
}): EngineStub {
	const handlers = new Set<() => void>();
	const signal = fromPartial<RBXScriptSignal>({
		Connect(handler: () => void) {
			handlers.add(handler);
			const connection: RBXScriptConnection = fromAny({
				Disconnect() {
					handlers.delete(handler);
				},
			});

			return connection;
		},
	} satisfies Partial<RBXScriptSignal>);

	const userInputService = {
		GetPropertyChangedSignal() {
			return signal;
		},
		PreferredInput: options.preferred ?? Enum.PreferredInput.KeyboardAndMouse,
	} satisfies Partial<UserInputService>;

	const runService = {
		IsClient() {
			return options.isClient;
		},
	} satisfies Partial<RunService>;

	jest.resetModules();

	jest.doMock<typeof import("@rbxts/services")>("@rbxts/services", () => {
		return fromPartial({
			RunService: runService,
			UserInputService: userInputService,
		});
	});

	let engineInputSource!: InputPlatformSource;
	jest.isolateModules(() => {
		({ engineInputSource } = import("./engine-source").expect());
	});

	return {
		isWatched: () => !handlers.isEmpty(),
		setPreferred: (updated) => {
			userInputService.PreferredInput = updated;
			for (const handler of handlers) {
				handler();
			}
		},
		source: engineInputSource,
	};
}

describe("engineInputSource.find", () => {
	it("should report keyboard for KeyboardAndMouse", () => {
		expect.assertions(1);

		const engine = loadEngineSource({
			isClient: true,
			preferred: Enum.PreferredInput.KeyboardAndMouse,
		});

		expect(engine.source.find()).toBe("keyboard");
	});

	it("should report gamepad for Gamepad", () => {
		expect.assertions(1);

		const engine = loadEngineSource({
			isClient: true,
			preferred: Enum.PreferredInput.Gamepad,
		});

		expect(engine.source.find()).toBe("gamepad");
	});

	it("should report no device off the client", () => {
		expect.assertions(1);

		const engine = loadEngineSource({ isClient: false });

		expect(engine.source.find()).toBeUndefined();
	});
});

describe("engineInputSource.watch", () => {
	it("should call back when PreferredInput changes", () => {
		expect.assertions(1);

		const engine = loadEngineSource({
			isClient: true,
			preferred: Enum.PreferredInput.KeyboardAndMouse,
		});
		const [onChanged, handler] = jest.fn<() => void>();
		engine.source.watch(handler);

		engine.setPreferred(Enum.PreferredInput.Gamepad);

		expect(onChanged).toHaveBeenCalledOnce();
	});

	it("should release the connection when disconnected", () => {
		expect.assertions(2);

		const engine = loadEngineSource({
			isClient: true,
			preferred: Enum.PreferredInput.KeyboardAndMouse,
		});

		const disconnect = engine.source.watch(() => {})!;

		expect(engine.isWatched()).toBeTrue();

		disconnect();

		expect(engine.isWatched()).toBeFalse();
	});

	it("should report nothing to watch off the client", () => {
		expect.assertions(2);

		const engine = loadEngineSource({ isClient: false });

		expect(engine.source.watch(() => {})).toBeUndefined();
		expect(engine.isWatched()).toBeFalse();
	});
});
