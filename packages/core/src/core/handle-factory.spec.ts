import { describe, expect, it } from "@rbxts/jest-globals";

import { createHandleFactory } from "./handle-factory";

describe("createHandleFactory", () => {
	it("should start at 0", () => {
		expect.assertions(1);

		const factory = createHandleFactory();
		const handle = factory.allocate();

		expect(handle).toBe(0);
	});

	it("should allocate sequential handles", () => {
		expect.assertions(1);

		const factory = createHandleFactory();
		const first = factory.allocate();
		const second = factory.allocate();

		expect(second).toBe(first + 1);
	});

	it("should allocate unique handles", () => {
		expect.assertions(1);

		const factory = createHandleFactory();
		const first = factory.allocate();
		const second = factory.allocate();

		expect(first).never.toBe(second);
	});
});
