import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

import type { TestContexts } from "../../test/fixtures";
import { TEST_ACTIONS, TEST_CONTEXTS } from "../../test/fixtures";
import { createFluxReact } from "../create-flux-react";

_G.__DEV__ = true;

describe("useFluxCore", () => {
	it("should return the core supplied to the FluxProvider", () => {
		expect.assertions(1);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
		const { FluxProvider, useFluxCore } = flux;

		function Probe(): React.ReactNode {
			const fluxCore = useFluxCore();
			return <textlabel Text={`same:${tostring(fluxCore === core)}`} />;
		}

		const { queryByText } = render(
			<FluxProvider core={core} handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText("same:true")).toBeDefined();
	});

	it("should throw when used outside a FluxProvider", () => {
		expect.assertions(1);

		afterThis(() => {
			cleanup();
		});

		const { useFluxCore } = createFluxReact<typeof TEST_ACTIONS, TestContexts>();

		function Probe(): React.ReactNode {
			useFluxCore();
			return <frame />;
		}

		expect(() => render(<Probe />)).toThrow("Flux hooks must be used within a FluxProvider");
	});

	it("should let components imperatively call addContext via the returned core", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
		const { FluxProvider, useFluxCore } = flux;

		function Probe(): React.ReactNode {
			const fluxCore = useFluxCore();
			fluxCore.addContext(handle, "menu");
			return <frame />;
		}

		expect(core.hasContext(handle, "menu")).toBeFalse();

		render(
			<FluxProvider core={core} handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(core.hasContext(handle, "menu")).toBeTrue();
	});
});
