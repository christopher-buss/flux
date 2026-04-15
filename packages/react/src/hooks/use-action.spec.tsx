/* eslint-disable flawless/naming-convention -- React components use PascalCase */
import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import type { InputHandle } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it, jest } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React, { StrictMode } from "@rbxts/react";

import {
	FRAME_TIME,
	HOLD_THRESHOLD,
	TAP_THRESHOLD,
	TEST_ACTIONS,
	TEST_CONTEXTS,
} from "../../test/fixtures";
import { createCountingProbe, createLabeledJumpProbe } from "../../test/probes";
import { createFluxReact } from "../create-flux-react";

_G.__DEV__ = true;

describe("useAction", () => {
	describe("selector semantics", () => {
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

	describe("handle and rerender resync", () => {
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
				return (
					<textlabel Text={`${tostring(isDefaultJump)}|${tostring(isExplicitJump)}`} />
				);
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

	describe("context triggers under StrictMode", () => {
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
});
