import type { ActionMap, ContextConfig } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import React from "@rbxts/react";

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

type TestContexts = keyof typeof TEST_CONTEXTS;

describe("createFluxReact", () => {
	it("should return flush, FluxProvider, and hook factories without requiring core", () => {
		expect.assertions(4);

		const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();

		expect(flux.flush).toBeFunction();
		expect(flux.FluxProvider).toBeFunction();
		expect(flux.useAction).toBeFunction();
		expect(flux.useFluxCore).toBeFunction();
	});

	it("should produce a FluxProvider that accepts a core plus a handle", () => {
		expect.assertions(1);

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
		const handle = core.register(new Instance("Folder"), "gameplay");
		const element = React.createElement(flux.FluxProvider, { core, handle });

		expect(element.props.core).toBe(core);
	});
});
