import { describe, expect, it } from "@rbxts/jest-globals";

import { doubleTap } from "./double-tap";

describe("doubleTap", () => {
	const deltaTime = 0.016;

	it("should return 'none' on first tap", () => {
		expect.assertions(1);

		const trigger = doubleTap({ window: 0.5 });

		expect(trigger.update(1, 0, deltaTime)).toBe("none");
	});

	it("should return 'triggered' on second tap within window", () => {
		expect.assertions(1);

		const trigger = doubleTap({ window: 0.5 });
		trigger.update(1, 0, deltaTime);
		trigger.update(0, 0, deltaTime);

		expect(trigger.update(1, 0, deltaTime)).toBe("triggered");
	});

	it("should return 'none' if second tap is outside window", () => {
		expect.assertions(1);

		const trigger = doubleTap({ window: 0 });

		trigger.update(1, 0, deltaTime);
		trigger.update(0, 0, deltaTime);

		expect(trigger.update(1, 0, deltaTime)).toBe("none");
	});

	it("should clear state on reset", () => {
		expect.assertions(1);

		const trigger = doubleTap({ window: 0.5 });
		trigger.update(1, 0, deltaTime);
		trigger.reset!();

		expect(trigger.update(1, 0, deltaTime)).toBe("none");
	});

	it("should not count sustained holds as multiple taps", () => {
		expect.assertions(3);

		const trigger = doubleTap({ window: 0.5 });

		expect(trigger.update(1, 0, deltaTime)).toBe("none");
		expect(trigger.update(1, 0, deltaTime)).toBe("none");
		expect(trigger.update(1, 0, deltaTime)).toBe("none");
	});
});
