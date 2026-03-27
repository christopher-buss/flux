import { describe, expect, it } from "@rbxts/jest-globals";

import type { Modifier, ModifierContext } from "../modifiers/types";
import type { Trigger, TriggerState, TypedTrigger } from "../triggers/types";
import type { ActionConfig } from "../types/actions";
import type { InputHandle } from "../types/core";
import { processPipeline } from "./pipeline";

const MODIFIER_CONTEXT = {
	deltaTime: 0.016,
	handle: 0 as InputHandle,
} satisfies ModifierContext;

function mockTrigger(returnState: TriggerState): Trigger {
	return {
		update(): TriggerState {
			return returnState;
		},
	};
}

function createTypedTrigger(
	triggerKind: TypedTrigger["type"],
	returnState: TriggerState,
): TypedTrigger {
	return { trigger: mockTrigger(returnState), type: triggerKind };
}

const doubleModifier: Modifier = {
	modify(value: never): never {
		if (typeIs(value, "number")) {
			return (value * 2) as never;
		}

		return value;
	},
};

const addOneModifier: Modifier = {
	modify(value: never): never {
		if (typeIs(value, "number")) {
			return ((value as number) + 1) as never;
		}

		return value;
	},
};

describe("processPipeline", () => {
	it("should pass value through with no modifiers or triggers, triggered when magnitude > 0", () => {
		expect.assertions(2);

		const config = { type: "Direction1D" } satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.value).toBe(5);
		expect(result.triggerState).toBe("triggered");
	});

	it("should apply a single modifier to transform the value", () => {
		expect.assertions(1);

		const config = {
			modifiers: [doubleModifier],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 3,
		});

		expect(result.value).toBe(6);
	});

	it("should chain multiple modifiers in order", () => {
		expect.assertions(1);

		const config = {
			modifiers: [doubleModifier, addOneModifier],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 3,
		});

		// 3 * 2 = 6, then 6 + 1 = 7
		expect(result.value).toBe(7);
	});

	it("should trigger when a single implicit trigger returns triggered", () => {
		expect.assertions(1);

		const config = {
			triggers: [createTypedTrigger("implicit", "triggered")],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.triggerState).toBe("triggered");
	});

	it("should trigger when a single explicit trigger returns triggered", () => {
		expect.assertions(1);

		const config = {
			triggers: [createTypedTrigger("explicit", "triggered")],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.triggerState).toBe("triggered");
	});

	it("should return none when a blocker trigger returns triggered", () => {
		expect.assertions(1);

		const config = {
			triggers: [createTypedTrigger("blocker", "triggered")],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.triggerState).toBe("none");
	});

	it("should trigger when explicit returns triggered even if implicit returns none", () => {
		expect.assertions(1);

		const config = {
			triggers: [
				createTypedTrigger("implicit", "none"),
				createTypedTrigger("explicit", "triggered"),
			],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.triggerState).toBe("triggered");
	});

	it("should compute magnitude as 0 or 1 for bool actions", () => {
		expect.assertions(2);

		const config = { type: "Bool" } satisfies ActionConfig;

		const resultTrue = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: true,
		});

		expect(resultTrue.triggerState).toBe("triggered");

		const resultFalse = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: false,
		});

		expect(resultFalse.triggerState).toBe("none");
	});

	it("should compute magnitude as vector length for axis actions", () => {
		expect.assertions(1);

		const config = { type: "Direction2D" } satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: new Vector2(3, 4),
		});

		// magnitude = 5, so triggered
		expect(result.triggerState).toBe("triggered");
	});

	it("should return none state when no triggers and zero magnitude", () => {
		expect.assertions(1);

		const config = { type: "Bool" } satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: false,
		});

		expect(result.triggerState).toBe("none");
	});

	it("should skip modifiers for bool actions", () => {
		expect.assertions(1);

		const config = {
			modifiers: [doubleModifier],
			type: "Bool",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: true,
		});

		expect(result.value).toBeTrue();
	});

	it("should require all implicit triggers to pass", () => {
		expect.assertions(1);

		const config = {
			triggers: [
				createTypedTrigger("implicit", "triggered"),
				createTypedTrigger("implicit", "none"),
			],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.triggerState).toBe("none");
	});

	it("should propagate ongoing state", () => {
		expect.assertions(1);

		const config = {
			triggers: [createTypedTrigger("implicit", "ongoing")],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.triggerState).toBe("ongoing");
	});

	it("should propagate canceled state", () => {
		expect.assertions(1);

		const config = {
			triggers: [createTypedTrigger("implicit", "canceled")],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.triggerState).toBe("canceled");
	});

	it("should let blocker override explicit trigger", () => {
		expect.assertions(1);

		const config = {
			triggers: [
				createTypedTrigger("blocker", "triggered"),
				createTypedTrigger("explicit", "triggered"),
			],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.triggerState).toBe("none");
	});

	it("should short-circuit multiple blockers after first triggered", () => {
		expect.assertions(1);

		const config = {
			triggers: [
				createTypedTrigger("blocker", "triggered"),
				createTypedTrigger("blocker", "triggered"),
			],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.triggerState).toBe("none");
	});

	it("should short-circuit multiple explicit triggers after first triggered", () => {
		expect.assertions(1);

		const config = {
			triggers: [
				createTypedTrigger("explicit", "triggered"),
				createTypedTrigger("explicit", "triggered"),
			],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.triggerState).toBe("triggered");
	});

	it("should short-circuit implicit when one is not triggered", () => {
		expect.assertions(1);

		const config = {
			triggers: [
				createTypedTrigger("implicit", "none"),
				createTypedTrigger("implicit", "triggered"),
			],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
		});

		expect(result.triggerState).toBe("none");
	});
});
