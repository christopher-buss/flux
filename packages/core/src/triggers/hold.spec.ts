import { describe, expect, it } from "@rbxts/jest-globals";

import { hold } from "./hold";

describe("hold", () => {
	const options = { attempting: 0.1, threshold: 0.5 };
	const deltaTime = 0.016;

	it("should return 'none' when magnitude is 0 with no prior input", () => {
		expect.assertions(1);

		const trigger = hold(options);

		expect(trigger.update(0, 0, deltaTime)).toBe("none");
	});

	it("should return 'ongoing' while held below threshold duration", () => {
		expect.assertions(1);

		const trigger = hold(options);

		expect(trigger.update(1, 0.3, deltaTime)).toBe("ongoing");
	});

	it("should return 'triggered' when duration reaches threshold", () => {
		expect.assertions(1);

		const trigger = hold(options);

		expect(trigger.update(1, 0.5, deltaTime)).toBe("triggered");
	});

	it("should return 'triggered' repeatedly without oneShot", () => {
		expect.assertions(2);

		const trigger = hold(options);

		expect(trigger.update(1, 0.5, deltaTime)).toBe("triggered");
		expect(trigger.update(1, 0.6, deltaTime)).toBe("triggered");
	});

	it("should return 'triggered' once then 'none' with oneShot", () => {
		expect.assertions(2);

		const trigger = hold({ ...options, oneShot: true });

		expect(trigger.update(1, 0.5, deltaTime)).toBe("triggered");
		expect(trigger.update(1, 0.6, deltaTime)).toBe("none");
	});

	it("should return 'canceled' when released after attempting but before threshold", () => {
		expect.assertions(1);

		const trigger = hold(options);
		trigger.update(1, 0.3, deltaTime);

		expect(trigger.update(0, 0.3, deltaTime)).toBe("canceled");
	});

	it("should reset hasTriggered state", () => {
		expect.assertions(2);

		const trigger = hold({ ...options, oneShot: true });
		trigger.update(1, 0.5, deltaTime);
		trigger.update(1, 0.6, deltaTime);
		trigger.reset();

		expect(trigger.update(1, 0.5, deltaTime)).toBe("triggered");
		expect(trigger.update(1, 0.6, deltaTime)).toBe("none");
	});
});
