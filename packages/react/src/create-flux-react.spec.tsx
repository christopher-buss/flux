import type { ActionMap, ContextConfig } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";

import { createFluxReact } from "./create-flux-react";

_G.__DEV__ = true;

const TEST_ACTIONS = {
	jump: { type: "Bool" as const },
} satisfies ActionMap;

const TEST_CONTEXTS = {
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.Space],
		},
		priority: 0,
	},
} satisfies Record<string, ContextConfig>;

describe("createFluxReact", () => {
	it("should create a FluxReact instance with core and flush", () => {
		expect.assertions(3);

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const flux = createFluxReact({ core });

		expect(flux.core).toBe(core);
		expect(flux.flush).toBeFunction();
		expect(flux.useAction).toBeFunction();
	});
});
