import { describe, expect, it } from "@rbxts/jest-globals";

import { mapPreferredInput } from "./preferred-input";

describe("mapPreferredInput", () => {
	it("should map KeyboardAndMouse to keyboard", () => {
		expect.assertions(1);

		expect(mapPreferredInput(Enum.PreferredInput.KeyboardAndMouse)).toBe("keyboard");
	});

	it("should map Gamepad to gamepad", () => {
		expect.assertions(1);

		expect(mapPreferredInput(Enum.PreferredInput.Gamepad)).toBe("gamepad");
	});

	it("should map Touch to touch", () => {
		expect.assertions(1);

		expect(mapPreferredInput(Enum.PreferredInput.Touch)).toBe("touch");
	});
});
