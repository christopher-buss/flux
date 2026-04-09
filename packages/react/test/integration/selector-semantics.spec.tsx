/* eslint-disable flawless/naming-convention -- React components use PascalCase */
import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

import { createFluxReact } from "../../src";
import { FRAME_TIME, TEST_ACTIONS, TEST_CONTEXTS } from "./fixtures";
import { createCountingProbe } from "./helpers/probes";

_G.__DEV__ = true;

describe("useAction selector semantics", () => {
	it("should rerender exactly once per Bool value flip", () => {
		expect.assertions(3);

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

		expect(probe.getRenderCount()).toBe(1);

		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(probe.getRenderCount()).toBe(2);

		core.simulateAction(handle, "jump", false);
		core.update(FRAME_TIME);
		flux.flush();

		expect(probe.getRenderCount()).toBe(3);
	});

	it("should not rerender when holding a Bool value across flushes", () => {
		expect.assertions(2);

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

		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);
		flux.flush();

		expect(probe.getRenderCount()).toBe(2);

		for (let index = 0; index < 3; index += 1) {
			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);
			flux.flush();
		}

		expect(probe.getRenderCount()).toBe(2);
	});

	it("should rerender when an Axis1d selector value changes", () => {
		expect.assertions(3);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;
		const probe = createCountingProbe(useAction, (state) => state.axis1d("throttle"));
		const Probe = probe.component;

		render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(probe.getRenderCount()).toBe(1);

		core.simulateAction(handle, "throttle", 0.75);
		core.update(FRAME_TIME);
		flux.flush();

		expect(probe.getRenderCount()).toBe(2);

		core.simulateAction(handle, "throttle", 0.75);
		core.update(FRAME_TIME);
		flux.flush();

		expect(probe.getRenderCount()).toBe(2);
	});

	it("should rerender only the changed axis when using scalar Vector2 selectors", () => {
		expect.assertions(4);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;
		const probeX = createCountingProbe(useAction, (state) => state.direction2d("move").X);
		const probeY = createCountingProbe(useAction, (state) => state.direction2d("move").Y);
		const ProbeX = probeX.component;
		const ProbeY = probeY.component;

		render(
			<FluxProvider handle={handle}>
				<ProbeX />
				<ProbeY />
			</FluxProvider>,
		);

		expect(probeX.getRenderCount()).toBe(1);
		expect(probeY.getRenderCount()).toBe(1);

		core.simulateAction(handle, "move", new Vector2(1, 0));
		core.update(FRAME_TIME);
		flux.flush();

		expect(probeX.getRenderCount()).toBe(2);
		expect(probeY.getRenderCount()).toBe(1);
	});

	it("should not rerender for an unchanged Vector2 selector value", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;
		const probe = createCountingProbe(useAction, (state) => state.direction2d("move"));
		const Probe = probe.component;

		render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		core.simulateAction(handle, "move", new Vector2(0.5, 0.5));
		core.update(FRAME_TIME);
		flux.flush();

		expect(probe.getRenderCount()).toBe(2);

		for (let index = 0; index < 3; index += 1) {
			core.simulateAction(handle, "move", new Vector2(0.5, 0.5));
			core.update(FRAME_TIME);
			flux.flush();
		}

		expect(probe.getRenderCount()).toBe(2);
	});

	it("should rerender every flush when a selector returns a fresh table", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useAction } = flux;
		const probe = createCountingProbe(useAction, (state) => [state.pressed("jump")]);
		const Probe = probe.component;

		render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(probe.getRenderCount()).toBe(1);

		for (let index = 0; index < 3; index += 1) {
			core.update(FRAME_TIME);
			flux.flush();
		}

		expect(probe.getRenderCount()).toBe(4);
	});
});
