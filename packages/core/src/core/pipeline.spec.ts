import { describe, expect, it } from "@rbxts/jest-globals";
import { fromAny } from "@rbxts/jest-utils";

import type { Modifier, ModifierContext } from "../modifiers/types";
import type { Trigger, TriggerInstance, TriggerState } from "../triggers/types";
import type { ActionConfig } from "../types/actions";
import type { InputHandle } from "../types/core";
import { processPipeline } from "./pipeline";

const MODIFIER_CONTEXT = {
	deltaTime: 0.016,
	handle: fromAny<InputHandle, number>(0),
} satisfies ModifierContext;

function mockTrigger(returnState: TriggerState): Trigger {
	return {
		update(): TriggerState {
			return returnState;
		},
	};
}

function createTriggerInstance(
	triggerKind: TriggerInstance["type"],
	returnState: TriggerState,
): TriggerInstance {
	return { trigger: mockTrigger(returnState), type: triggerKind };
}

const doubleModifier: Modifier = {
	modify(value: never): never {
		if (typeIs(value, "number")) {
			return fromAny(value * 2);
		}

		return value;
	},
};

const incrementModifier: Modifier = {
	modify(value: never): never {
		if (typeIs(value, "number")) {
			return fromAny((value as number) + 1);
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
			triggerInstances: [],
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
			triggerInstances: [],
		});

		expect(result.value).toBe(6);
	});

	it("should chain multiple modifiers in order", () => {
		expect.assertions(1);

		const config = {
			modifiers: [doubleModifier, incrementModifier],
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 3,
			triggerInstances: [],
		});

		// 3 * 2 = 6, then 6 + 1 = 7
		expect(result.value).toBe(7);
	});

	it("should trigger when a single implicit trigger returns triggered", () => {
		expect.assertions(1);

		const triggers = [createTriggerInstance("implicit", "triggered")];
		const config = {
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
			triggerInstances: triggers,
		});

		expect(result.triggerState).toBe("triggered");
	});

	it("should trigger when a single explicit trigger returns triggered", () => {
		expect.assertions(1);

		const triggers = [createTriggerInstance("explicit", "triggered")];
		const config = {
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
			triggerInstances: triggers,
		});

		expect(result.triggerState).toBe("triggered");
	});

	it("should return none when a blocker trigger returns triggered", () => {
		expect.assertions(1);

		const triggers = [createTriggerInstance("blocker", "triggered")];
		const config = {
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
			triggerInstances: triggers,
		});

		expect(result.triggerState).toBe("none");
	});

	it("should trigger when explicit returns triggered even if implicit returns none", () => {
		expect.assertions(1);

		const triggers = [
			createTriggerInstance("implicit", "none"),
			createTriggerInstance("explicit", "triggered"),
		];
		const config = {
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
			triggerInstances: triggers,
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
			triggerInstances: [],
		});

		expect(resultTrue.triggerState).toBe("triggered");

		const resultFalse = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: false,
			triggerInstances: [],
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
			triggerInstances: [],
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
			triggerInstances: [],
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
			triggerInstances: [],
		});

		expect(result.value).toBeTrue();
	});

	it("should require all implicit triggers to pass", () => {
		expect.assertions(1);

		const triggers = [
			createTriggerInstance("implicit", "triggered"),
			createTriggerInstance("implicit", "none"),
		];
		const config = {
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
			triggerInstances: triggers,
		});

		expect(result.triggerState).toBe("none");
	});

	it("should propagate ongoing state", () => {
		expect.assertions(1);

		const triggers = [createTriggerInstance("implicit", "ongoing")];
		const config = {
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
			triggerInstances: triggers,
		});

		expect(result.triggerState).toBe("ongoing");
	});

	it("should propagate canceled state", () => {
		expect.assertions(1);

		const triggers = [createTriggerInstance("implicit", "canceled")];
		const config = {
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
			triggerInstances: triggers,
		});

		expect(result.triggerState).toBe("canceled");
	});

	it("should let blocker override explicit trigger", () => {
		expect.assertions(1);

		const triggers = [
			createTriggerInstance("blocker", "triggered"),
			createTriggerInstance("explicit", "triggered"),
		];
		const config = {
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
			triggerInstances: triggers,
		});

		expect(result.triggerState).toBe("none");
	});

	it("should short-circuit multiple blockers after first triggered", () => {
		expect.assertions(1);

		const triggers = [
			createTriggerInstance("blocker", "triggered"),
			createTriggerInstance("blocker", "triggered"),
		];
		const config = {
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
			triggerInstances: triggers,
		});

		expect(result.triggerState).toBe("none");
	});

	it("should short-circuit multiple explicit triggers after first triggered", () => {
		expect.assertions(1);

		const triggers = [
			createTriggerInstance("explicit", "triggered"),
			createTriggerInstance("explicit", "triggered"),
		];
		const config = {
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
			triggerInstances: triggers,
		});

		expect(result.triggerState).toBe("triggered");
	});

	it("should short-circuit implicit when one is not triggered", () => {
		expect.assertions(1);

		const triggers = [
			createTriggerInstance("implicit", "none"),
			createTriggerInstance("implicit", "triggered"),
		];
		const config = {
			type: "Direction1D",
		} satisfies ActionConfig;
		const result = processPipeline({
			actionConfig: config,
			deltaTime: 0.016,
			duration: 0,
			modifierContext: MODIFIER_CONTEXT,
			rawValue: 5,
			triggerInstances: triggers,
		});

		expect(result.triggerState).toBe("none");
	});
});
