import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import { createCore } from "@rbxts/flux";
import { describe, expect, it, jest } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

import { createFluxReact } from "./create-flux-react";
import { FRAME_TIME, TEST_ACTIONS, TEST_CONTEXTS } from "./test-fixtures";
import { createLabeledJumpProbe } from "./test-probes";

_G.__DEV__ = true;

describe("provider lifecycle", () => {
	it("should subscribe on mount and unsubscribe on unmount", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;

		// eslint-disable-next-line flawless/naming-convention -- React component
		const Probe = createLabeledJumpProbe(useAction);

		const { unmount } = render(
			<FluxProvider handle={handle}>
				<Probe label="jump" />
			</FluxProvider>,
		);

		const spy = jest.spyOn(core, "getState");

		flux.flush();

		expect(spy).toHaveBeenCalledOnce();

		unmount();
		spy.mockClear();
		flux.flush();

		expect(spy).never.toHaveBeenCalled();
	});

	it("should throw when useAction is called outside a FluxProvider", () => {
		expect.assertions(1);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const { useAction } = createFluxReact({ core });

		// eslint-disable-next-line flawless/naming-convention -- React component
		const Probe = createLabeledJumpProbe(useAction);

		expect(() => render(<Probe label="jump" />)).toThrow(
			"Flux hooks must be used within a FluxProvider",
		);
	});

	it("should let an inner Provider override the outer default handle", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const outerHandle = core.register(new Instance("Folder"), "gameplay");
		const innerHandle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;

		// eslint-disable-next-line flawless/naming-convention -- React component
		const Probe = createLabeledJumpProbe(useAction);

		const { queryByText } = render(
			<FluxProvider handle={outerHandle}>
				<Probe label="outer" />
				<FluxProvider handle={innerHandle}>
					<Probe label="inner" />
				</FluxProvider>
			</FluxProvider>,
		);

		core.simulateAction(innerHandle, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("outer:false")).toBeDefined();
		expect(queryByText("inner:true")).toBeDefined();
	});

	it("should isolate sibling Providers sharing one core and flux", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handleA = core.register(new Instance("Folder"), "gameplay");
		const handleB = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;

		// eslint-disable-next-line flawless/naming-convention -- React component
		const Probe = createLabeledJumpProbe(useAction);

		const { queryByText } = render(
			<>
				<FluxProvider handle={handleA}>
					<Probe label="a" />
				</FluxProvider>
				<FluxProvider handle={handleB}>
					<Probe label="b" />
				</FluxProvider>
			</>,
		);

		core.simulateAction(handleA, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("a:true")).toBeDefined();
		expect(queryByText("b:false")).toBeDefined();
	});

	it("should not reach core B when flushing flux A (cross-core isolation)", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const coreA = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const coreB = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handleA = coreA.register(new Instance("Folder"), "gameplay");
		const handleB = coreB.register(new Instance("Folder"), "gameplay");

		const fluxA = createFluxReact({ core: coreA });
		const fluxB = createFluxReact({ core: coreB });

		// eslint-disable-next-line flawless/naming-convention -- React component
		const ProbeA = createLabeledJumpProbe(fluxA.useAction);

		// eslint-disable-next-line flawless/naming-convention -- React component
		const ProbeB = createLabeledJumpProbe(fluxB.useAction);

		render(
			<>
				<fluxA.FluxProvider handle={handleA}>
					<ProbeA label="a" />
				</fluxA.FluxProvider>
				<fluxB.FluxProvider handle={handleB}>
					<ProbeB label="b" />
				</fluxB.FluxProvider>
			</>,
		);

		const spyA = jest.spyOn(coreA, "getState");
		const spyB = jest.spyOn(coreB, "getState");

		fluxA.flush();

		expect(spyA).toHaveBeenCalledOnce();
		expect(spyB).never.toHaveBeenCalled();
	});

	it("should treat double flush without an update as a no-op", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;

		// eslint-disable-next-line flawless/naming-convention -- React component
		const Probe = createLabeledJumpProbe(useAction);

		const { queryByText } = render(
			<FluxProvider handle={handle}>
				<Probe label="probe" />
			</FluxProvider>,
		);

		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("probe:true")).toBeDefined();

		flux.flush();

		expect(queryByText("probe:true")).toBeDefined();
	});
});
