/* eslint-disable flawless/naming-convention -- React components use PascalCase */

import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import { createCore } from "@rbxts/flux";
import { describe, expect, it, jest } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React, { StrictMode } from "@rbxts/react";

import { createFluxReact } from "../../src";
import { FRAME_TIME, HOLD_THRESHOLD, TAP_THRESHOLD, TEST_ACTIONS, TEST_CONTEXTS } from "./fixtures";
import { createCountingProbe, createLabeledJumpProbe } from "./helpers/probes";

_G.__DEV__ = true;

describe("context switching and triggers", () => {
	it("should reflect bindings activated via addContext and cleared via removeContext", () => {
		expect.assertions(3);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "menu");
		const flux = createFluxReact({ core });
		const Probe = createLabeledJumpProbe(flux.useAction);

		const { queryByText } = render(
			<flux.FluxProvider handle={handle}>
				<Probe label="jump" />
			</flux.FluxProvider>,
		);

		expect(queryByText("jump:false")).toBeDefined();

		core.addContext(handle, "gameplay");
		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("jump:true")).toBeDefined();

		core.removeContext(handle, "gameplay");
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("jump:false")).toBeDefined();
	});

	it("should transition press and release across frames", () => {
		expect.assertions(3);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const Probe = createLabeledJumpProbe(flux.useAction);

		const { queryByText } = render(
			<flux.FluxProvider handle={handle}>
				<Probe label="jump" />
			</flux.FluxProvider>,
		);

		expect(queryByText("jump:false")).toBeDefined();

		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("jump:true")).toBeDefined();

		core.simulateAction(handle, "jump", false);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("jump:false")).toBeDefined();
	});

	it("should fire a hold trigger after the threshold duration elapses", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;

		function ChargeProbe(): React.ReactNode {
			const isCharging = useAction((state) => state.pressed("charge"));
			return <textlabel Text={`charge:${tostring(isCharging)}`} />;
		}

		const { queryByText } = render(
			<FluxProvider handle={handle}>
				<ChargeProbe />
			</FluxProvider>,
		);

		core.simulateAction(handle, "charge", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("charge:false")).toBeDefined();

		core.simulateAction(handle, "charge", true);
		core.update(HOLD_THRESHOLD);
		flux.flush();

		expect(queryByText("charge:true")).toBeDefined();
	});

	it("should fire a tap trigger on quick press-release within the threshold", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;

		function DashProbe(): React.ReactNode {
			const isDashing = useAction((state) => state.pressed("dash"));
			return <textlabel Text={`dash:${tostring(isDashing)}`} />;
		}

		const { queryByText } = render(
			<FluxProvider handle={handle}>
				<DashProbe />
			</FluxProvider>,
		);

		core.simulateAction(handle, "dash", true);
		core.update(TAP_THRESHOLD / 2);
		flux.flush();

		expect(queryByText("dash:false")).toBeDefined();

		core.simulateAction(handle, "dash", false);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("dash:true")).toBeDefined();
	});

	it("should clear gameplay bindings when a sinking ui context is active", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;
		const Probe = createLabeledJumpProbe(useAction);

		const { queryByText } = render(
			<FluxProvider handle={handle}>
				<Probe label="jump" />
			</FluxProvider>,
		);

		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("jump:true")).toBeDefined();

		core.addContext(handle, "ui");
		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("jump:false")).toBeDefined();
	});

	it("should treat flush before any update as a no-op", () => {
		expect.assertions(1);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;
		const probe = createCountingProbe(useAction, (state) => state.pressed("jump"));
		const Probe = probe.component;

		render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		flux.flush();
		flux.flush();

		expect(probe.getRenderCount()).toBe(1);
	});

	it("should run correctly under React.StrictMode without leaking subscriptions", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;
		const Probe = createLabeledJumpProbe(useAction);

		const { queryByText, unmount } = render(
			<StrictMode>
				<FluxProvider handle={handle}>
					<Probe label="jump" />
				</FluxProvider>
			</StrictMode>,
		);

		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("jump:true")).toBeDefined();

		unmount();

		const spy = jest.spyOn(core, "getState");
		flux.flush();

		expect(spy).never.toHaveBeenCalled();
	});
});
