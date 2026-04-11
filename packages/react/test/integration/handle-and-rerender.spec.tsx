import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import type { InputHandle } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

import { createFluxReact } from "../../src";
import { FRAME_TIME, TEST_ACTIONS, TEST_CONTEXTS } from "./fixtures";
import { createLabeledJumpProbe } from "./helpers/probes";

_G.__DEV__ = true;

describe("useAction handle and rerender contract", () => {
	it("should delay resync when the Provider handle prop changes until the next flush", () => {
		expect.assertions(3);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handleA = core.register(new Instance("Folder"), "gameplay");
		const handleB = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;
		// eslint-disable-next-line flawless/naming-convention -- React element
		const Probe = createLabeledJumpProbe(useAction);

		core.simulateAction(handleA, "jump", true);
		core.update(FRAME_TIME);

		function Host({ handle }: { readonly handle: InputHandle }): React.ReactNode {
			return (
				<FluxProvider handle={handle}>
					<Probe label="probe" />
				</FluxProvider>
			);
		}

		const { queryByText, rerender } = render(<Host handle={handleA} />);

		flux.flush();

		expect(queryByText("probe:true")).toBeDefined();

		rerender(<Host handle={handleB} />);

		expect(queryByText("probe:true")).toBeDefined();

		flux.flush();

		expect(queryByText("probe:false")).toBeDefined();
	});

	it("should track distinct handles when siblings use the explicit-handle overload", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const defaultHandle = core.register(new Instance("Folder"), "gameplay");
		const explicitA = core.register(new Instance("Folder"), "gameplay");
		const explicitB = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;

		function ProbeA(): React.ReactNode {
			const isJumping = useAction(explicitA, (state) => state.pressed("jump"));
			return <textlabel Text={`a:${tostring(isJumping)}`} />;
		}

		function ProbeB(): React.ReactNode {
			const isJumping = useAction(explicitB, (state) => state.pressed("jump"));
			return <textlabel Text={`b:${tostring(isJumping)}`} />;
		}

		const { queryByText } = render(
			<FluxProvider handle={defaultHandle}>
				<ProbeA />
				<ProbeB />
			</FluxProvider>,
		);

		core.simulateAction(explicitA, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("a:true")).toBeDefined();
		expect(queryByText("b:false")).toBeDefined();
	});

	it("should mix default and explicit handles in the same component", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const defaultHandle = core.register(new Instance("Folder"), "gameplay");
		const explicitHandle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;

		function Probe(): React.ReactNode {
			const isDefaultJump = useAction((state) => state.pressed("jump"));
			const isExplicitJump = useAction(explicitHandle, (state) => state.pressed("jump"));
			return <textlabel Text={`${tostring(isDefaultJump)}|${tostring(isExplicitJump)}`} />;
		}

		const { queryByText } = render(
			<FluxProvider handle={defaultHandle}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText("false|false")).toBeDefined();

		core.simulateAction(defaultHandle, "jump", true);
		core.simulateAction(explicitHandle, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("true|true")).toBeDefined();
	});

	it("should leave explicit-handle consumers unaffected when the Provider handle prop swaps", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handleA = core.register(new Instance("Folder"), "gameplay");
		const handleB = core.register(new Instance("Folder"), "gameplay");
		const explicitHandle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;

		core.simulateAction(explicitHandle, "jump", true);
		core.update(FRAME_TIME);

		function Explicit(): React.ReactNode {
			const isJumping = useAction(explicitHandle, (state) => state.pressed("jump"));
			return <textlabel Text={`explicit:${tostring(isJumping)}`} />;
		}

		function Host({ handle }: { readonly handle: InputHandle }): React.ReactNode {
			return (
				<FluxProvider handle={handle}>
					<Explicit />
				</FluxProvider>
			);
		}

		const { queryByText, rerender } = render(<Host handle={handleA} />);

		flux.flush();

		expect(queryByText("explicit:true")).toBeDefined();

		rerender(<Host handle={handleB} />);
		flux.flush();

		expect(queryByText("explicit:true")).toBeDefined();
	});
});
