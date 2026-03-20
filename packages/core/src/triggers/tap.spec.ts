import { describe, expect, it } from "@rbxts/jest-globals";

import { tap } from "./tap";

describe("tap", () => {
	const deltaTime = 0.016;

	it("should return 'ongoing' while magnitude > 0", () => {
		expect.assertions(1);

		const trigger = tap({ threshold: 0.3 });

		expect(trigger.update(1, 0.1, deltaTime)).toBe("ongoing");
	});

	it("should return 'triggered' on release if duration < threshold", () => {
		expect.assertions(1);

		const trigger = tap({ threshold: 0.3 });

		expect(trigger.update(0, 0.2, deltaTime)).toBe("triggered");
	});

	it("should return 'none' on release if duration >= threshold", () => {
		expect.assertions(1);

		const trigger = tap({ threshold: 0.3 });

		expect(trigger.update(0, 0.5, deltaTime)).toBe("none");
	});

	it("should return 'none' when magnitude is 0 and no prior duration", () => {
		expect.assertions(1);

		const trigger = tap({ threshold: 0.3 });

		expect(trigger.update(0, 0, deltaTime)).toBe("none");
	});
});
