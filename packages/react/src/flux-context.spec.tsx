import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

import type { TestContexts } from "../test/fixtures";
import { TEST_ACTIONS, TEST_CONTEXTS } from "../test/fixtures";
import { createLabeledJumpProbe } from "../test/probes";
import { createFluxReact } from "./create-flux-react";

_G.__DEV__ = true;

describe("createUseFluxContext", () => {
	it("should throw the assertion message when used outside a FluxProvider", () => {
		expect.assertions(1);

		afterThis(() => {
			cleanup();
		});

		const { useAction } = createFluxReact<typeof TEST_ACTIONS, TestContexts>();

		// eslint-disable-next-line flawless/naming-convention -- React component
		const Probe = createLabeledJumpProbe(useAction);

		expect(() => render(<Probe label="jump" />)).toThrow(
			"Flux hooks must be used within a FluxProvider",
		);
	});

	it("should return the context value when called inside a FluxProvider", () => {
		expect.assertions(1);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
		const { FluxProvider, useAction } = flux;

		// eslint-disable-next-line flawless/naming-convention -- React component
		const Probe = createLabeledJumpProbe(useAction);

		const { queryByText } = render(
			<FluxProvider core={core} handle={handle}>
				<Probe label="jump" />
			</FluxProvider>,
		);

		expect(queryByText("jump:false")).toBeDefined();
	});

	it("should work with a distinct FluxReact instance and its own action map", () => {
		expect.assertions(1);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
		const { FluxProvider, useAction } = flux;

		// eslint-disable-next-line flawless/naming-convention -- React component
		const Probe = createLabeledJumpProbe(useAction);

		const { queryByText } = render(
			<FluxProvider core={core} handle={handle}>
				<Probe label="smoke" />
			</FluxProvider>,
		);

		expect(queryByText("smoke:false")).toBeDefined();
	});
});
