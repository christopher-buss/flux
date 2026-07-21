import { RunService, UserInputService } from "@rbxts/services";

import type { InputPlatform } from "../bindings/classify";
import { mapPreferredInput } from "./preferred-input";
import type { InputPlatformSource } from "./source";

/**
 * The platform source backed by the Roblox engine.
 *
 * Answers what the device is and when it changed; every rule about what to do
 * with that answer lives in `createInputPlatformSignal`.
 *
 * `UserInputService` is a client concept, so both entry points report "no
 * device" off the client rather than reading a service with no player behind
 * it.
 */
export const engineInputSource: InputPlatformSource = {
	find: (): InputPlatform | undefined => {
		if (!RunService.IsClient()) {
			return undefined;
		}

		return mapPreferredInput(UserInputService.PreferredInput);
	},
	watch: (onChanged: () => void): (() => void) | undefined => {
		if (!RunService.IsClient()) {
			return undefined;
		}

		const connection =
			UserInputService.GetPropertyChangedSignal("PreferredInput").Connect(onChanged);

		return () => {
			connection.Disconnect();
		};
	},
};
