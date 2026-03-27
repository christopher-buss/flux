import { describe, expect, it } from "@rbxts/jest-globals";

import type { PipelineOptions } from "../../src/core/pipeline";
import { processPipeline } from "../../src/core/pipeline";
import type { ModifierContext } from "../../src/modifiers";
import { deadZone, negate, scale } from "../../src/modifiers";
import { hold, implicit } from "../../src/triggers";
import type { InputHandle } from "../types/core";

const modifierContext = {
	deltaTime: 0.016,
	handle: 0 as InputHandle,
} satisfies ModifierContext;

describe("pipeline integration: deadZone + hold trigger", () => {
	it("should not trigger hold when input is below dead zone threshold", () => {
		expect.assertions(1);

		const options: PipelineOptions = {
			actionConfig: {
				modifiers: [deadZone(0.2)],
				triggers: [implicit(hold({ attempting: 0.1, threshold: 0.5 }))],
				type: "Direction1D",
			},
			deltaTime: 0.016,
			duration: 0,
			modifierContext,
			rawValue: 0.1,
		};

		const result = processPipeline(options);

		expect(result.triggerState).toBe("none");
	});

	it("should trigger hold when input exceeds dead zone and duration exceeds threshold", () => {
		expect.assertions(1);

		const options = {
			actionConfig: {
				modifiers: [deadZone(0.2)],
				triggers: [implicit(hold({ attempting: 0, threshold: 0.5 }))],
				type: "Direction1D",
			},
			deltaTime: 0.016,
			duration: 0.6,
			modifierContext,
			rawValue: 0.6,
		} satisfies PipelineOptions;

		const result = processPipeline(options);

		expect(result.triggerState).toBe("triggered");
	});
});

describe("pipeline integration: scale + implicit trigger", () => {
	it("should trigger when scaled magnitude exceeds zero", () => {
		expect.assertions(1);

		const options = {
			actionConfig: {
				modifiers: [scale(2)],
				triggers: [implicit(hold({ attempting: 0, threshold: 0 }))],
				type: "Direction1D",
			},
			deltaTime: 0.016,
			duration: 0,
			modifierContext,
			rawValue: 0.5,
		} satisfies PipelineOptions;

		const result = processPipeline(options);

		expect(result.triggerState).toBe("triggered");
	});

	it("should not trigger when scaled magnitude is zero", () => {
		expect.assertions(1);

		const options = {
			actionConfig: {
				modifiers: [scale(2)],
				triggers: [implicit(hold({ attempting: 0, threshold: 0 }))],
				type: "Direction1D",
			},
			deltaTime: 0.016,
			duration: 0,
			modifierContext,
			rawValue: 0,
		} satisfies PipelineOptions;

		const result = processPipeline(options);

		expect(result.triggerState).toBe("none");
	});
});

describe("pipeline integration: negate modifier preserves trigger behavior", () => {
	it("should negate the value while still triggering on nonzero magnitude", () => {
		expect.assertions(2);

		const options = {
			actionConfig: {
				modifiers: [negate()],
				type: "Direction1D",
			},
			deltaTime: 0.016,
			duration: 0,
			modifierContext,
			rawValue: 0.5,
		} satisfies PipelineOptions;

		const result = processPipeline(options);

		expect(result.value).toBe(-0.5);
		expect(result.triggerState).toBe("triggered");
	});
});
