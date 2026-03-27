import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import type { ModifierContext } from "../modifiers/types";
import type { TriggerState } from "../triggers/types";
import type { ActionConfig } from "../types/actions";
import type { ActionValueType } from "./action-state";
import type { PipelineOptions, PipelineResult } from "./pipeline";
import { processPipeline } from "./pipeline";

describe("processPipeline", () => {
	it("should accept PipelineOptions and return PipelineResult", () => {
		expectTypeOf(processPipeline).parameter(0).toEqualTypeOf<PipelineOptions>();
		expectTypeOf(processPipeline).returns.toEqualTypeOf<PipelineResult>();
	});
});

describe("PipelineOptions", () => {
	it("should have all required fields", () => {
		expectTypeOf<PipelineOptions>().toHaveProperty("actionConfig");
		expectTypeOf<PipelineOptions>().toHaveProperty("deltaTime");
		expectTypeOf<PipelineOptions>().toHaveProperty("duration");
		expectTypeOf<PipelineOptions>().toHaveProperty("modifierContext");
		expectTypeOf<PipelineOptions>().toHaveProperty("rawValue");
	});

	it("should type actionConfig as ActionConfig", () => {
		expectTypeOf<PipelineOptions["actionConfig"]>().toEqualTypeOf<ActionConfig>();
	});

	it("should type modifierContext as ModifierContext", () => {
		expectTypeOf<PipelineOptions["modifierContext"]>().toEqualTypeOf<ModifierContext>();
	});

	it("should type rawValue as ActionValueType", () => {
		expectTypeOf<PipelineOptions["rawValue"]>().toEqualTypeOf<ActionValueType>();
	});

	it("should type deltaTime and duration as number", () => {
		expectTypeOf<PipelineOptions["deltaTime"]>().toEqualTypeOf<number>();
		expectTypeOf<PipelineOptions["duration"]>().toEqualTypeOf<number>();
	});
});

describe("PipelineResult", () => {
	it("should have triggerState and value fields", () => {
		expectTypeOf<PipelineResult>().toHaveProperty("triggerState");
		expectTypeOf<PipelineResult>().toHaveProperty("value");
	});

	it("should type triggerState as TriggerState", () => {
		expectTypeOf<PipelineResult["triggerState"]>().toEqualTypeOf<TriggerState>();
	});

	it("should type value as ActionValueType", () => {
		expectTypeOf<PipelineResult["value"]>().toEqualTypeOf<ActionValueType>();
	});
});
