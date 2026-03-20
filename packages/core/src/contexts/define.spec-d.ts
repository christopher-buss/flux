import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import type { ContextConfig } from "../types/contexts";
import { defineContexts } from "./define";

describe("defineContexts", () => {
	it("should preserve literal context names", () => {
		const contexts = defineContexts({
			gameplay: { bindings: {}, priority: 0 },
			ui: { bindings: {}, priority: 10, sink: true },
		});

		expectTypeOf(contexts).toHaveProperty("gameplay");
		expectTypeOf(contexts).toHaveProperty("ui");
	});

	it("should preserve ContextConfig shape", () => {
		const contexts = defineContexts({
			gameplay: {
				bindings: {
					jump: [Enum.KeyCode.Space],
				},
				priority: 0,
			},
		});

		expectTypeOf(contexts.gameplay).toExtend<ContextConfig>();
	});

	it("should reject invalid context config", () => {
		// @ts-expect-error missing required 'priority' field
		defineContexts({ gameplay: { bindings: {} } });
	});

	it("should reject invalid binding values", () => {
		// @ts-expect-error string is not a valid BindingLike
		defineContexts({ gameplay: { bindings: { jump: ["Space"] }, priority: 0 } });
	});
});
