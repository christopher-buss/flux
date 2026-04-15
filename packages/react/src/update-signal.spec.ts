import { describe, expect, it } from "@rbxts/jest-globals";

import { createUpdateSignal } from "./update-signal";

interface CountingListener {
	readonly getCount: () => number;
	readonly listener: () => void;
}

function createCountingListener(): CountingListener {
	let count = 0;
	return {
		getCount: () => count,
		listener: () => {
			count += 1;
		},
	};
}

describe("createUpdateSignal", () => {
	it("should invoke all subscribed listeners when fire is called", () => {
		expect.assertions(2);

		const signal = createUpdateSignal();
		const first = createCountingListener();
		const second = createCountingListener();

		signal.subscribe(first.listener);
		signal.subscribe(second.listener);
		signal.fire();

		expect(first.getCount()).toBe(1);
		expect(second.getCount()).toBe(1);
	});

	it("should stop notifying a listener after its disconnect is called", () => {
		expect.assertions(2);

		const signal = createUpdateSignal();
		const subscriber = createCountingListener();
		const disconnect = signal.subscribe(subscriber.listener);

		signal.fire();
		disconnect();
		signal.fire();

		expect(subscriber.getCount()).toBe(1);
		expect(disconnect).toBeFunction();
	});

	it("should only notify remaining listeners after one is disconnected", () => {
		expect.assertions(2);

		const signal = createUpdateSignal();
		const first = createCountingListener();
		const second = createCountingListener();
		const disconnectFirst = signal.subscribe(first.listener);
		signal.subscribe(second.listener);

		disconnectFirst();
		signal.fire();

		expect(first.getCount()).toBe(0);
		expect(second.getCount()).toBe(1);
	});

	it("should dedupe identical listener references via Set storage", () => {
		expect.assertions(1);

		const signal = createUpdateSignal();
		const subscriber = createCountingListener();

		signal.subscribe(subscriber.listener);
		signal.subscribe(subscriber.listener);
		signal.fire();

		expect(subscriber.getCount()).toBe(1);
	});

	it("should treat fire with no subscribers as a no-op", () => {
		expect.assertions(1);

		const signal = createUpdateSignal();

		expect(() => {
			signal.fire();
		}).never.toThrow();
	});
});
