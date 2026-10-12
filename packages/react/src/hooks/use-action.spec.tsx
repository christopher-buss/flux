import {
	cleanup,
	queryByText as queryInContainer,
	render,
} from "@flux/test-utils/react-testing-library-lua";
import {
	unstable_clearYields,
	unstable_flushNumberOfYields,
	unstable_yieldValue,
} from "@flux/test-utils/scheduler";
import type { InputHandle } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it, jest } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React, { StrictMode, useLayoutEffect } from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";

import type { TestContexts } from "#test/fixtures";
import {
	FRAME_TIME,
	HOLD_THRESHOLD,
	TAP_THRESHOLD,
	TEST_ACTIONS,
	TEST_CONTEXTS,
} from "#test/fixtures";
import * as NativeStack from "#test/native-stack";
import type { FluxActionState } from "#test/probes";
import {
	createCountingProbe,
	createLabeledJumpProbe,
	makeLog,
	makeRenderCounter,
} from "#test/probes";
import { createFluxReact } from "../create-flux-react";

_G.__DEV__ = true;

type JumpSelection = ReadonlyArray<boolean>;
type JumpSelector = (state: FluxActionState) => JumpSelection;

function createNativeRoot() {
	const container = new Instance("Folder");
	const root = NativeStack.ReactRoblox.createRoot(container);
	NativeStack.Scheduler.unstable_clearYields();
	afterThis(() => {
		NativeStack.ReactRoblox.act(() => {
			root.unmount();
		});
		container.Destroy();
		NativeStack.Scheduler.unstable_clearYields();
	});
	return { container, root };
}

describe("useAction", () => {
	describe("selector semantics", () => {
		it("should rerender exactly once per Bool value flip", () => {
			expect.assertions(3);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;
			const probe = createCountingProbe(useAction, (state) => state.pressed("jump"));
			const Probe = probe.component;

			render(
				<FluxProvider core={core} handle={handle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;
			const probe = createCountingProbe(useAction, (state) => state.pressed("jump"));
			const Probe = probe.component;

			render(
				<FluxProvider core={core} handle={handle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;
			const probe = createCountingProbe(useAction, (state) => state.axis1d("throttle"));
			const Probe = probe.component;

			render(
				<FluxProvider core={core} handle={handle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;
			const probeX = createCountingProbe(useAction, (state) => state.direction2d("move").X);
			const probeY = createCountingProbe(useAction, (state) => state.direction2d("move").Y);
			const ProbeX = probeX.component;
			const ProbeY = probeY.component;

			render(
				<FluxProvider core={core} handle={handle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;
			const probe = createCountingProbe(useAction, (state) => state.direction2d("move"));
			const Probe = probe.component;

			render(
				<FluxProvider core={core} handle={handle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;
			const probe = createCountingProbe(useAction, (state) => [state.pressed("jump")]);
			const Probe = probe.component;

			render(
				<FluxProvider core={core} handle={handle}>
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
		it("should read a replacement explicit handle before the next flush", () => {
			expect.assertions(2);

			afterThis(cleanup);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const firstHandle = core.register(new Instance("Folder"), "gameplay");
			const secondHandle = core.register(new Instance("Folder"), "gameplay");
			const { FluxProvider, useAction } = createFluxReact<
				typeof TEST_ACTIONS,
				TestContexts
			>();
			const selectJump = (state: FluxActionState): boolean => state.pressed("jump");

			core.simulateAction(firstHandle, "jump", true);
			core.update(FRAME_TIME);

			function Host({ handle }: { readonly handle: InputHandle }): React.ReactNode {
				return (
					<FluxProvider core={core} handle={firstHandle}>
						<Probe handle={handle} />
					</FluxProvider>
				);
			}

			function Probe({ handle }: { readonly handle: InputHandle }): React.ReactNode {
				const isJumping = useAction(handle, selectJump);
				return <textlabel Text={`explicit:${tostring(isJumping)}`} />;
			}

			const { queryByText, rerender } = render(<Host handle={firstHandle} />);
			expect(queryByText("explicit:true")).toBeDefined();

			rerender(<Host handle={secondHandle} />);

			expect(queryByText("explicit:false")).toBeDefined();
		});

		it("should read a replacement action selector before the next flush", () => {
			expect.assertions(2);

			afterThis(cleanup);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const { FluxProvider, useAction } = createFluxReact<
				typeof TEST_ACTIONS,
				TestContexts
			>();
			const selectJump = (state: FluxActionState): boolean => state.pressed("jump");
			const selectInteract = (state: FluxActionState): boolean => state.pressed("interact");

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			function Host({
				selector,
			}: {
				readonly selector: (state: FluxActionState) => boolean;
			}): React.ReactNode {
				return (
					<FluxProvider core={core} handle={handle}>
						<Probe selector={selector} />
					</FluxProvider>
				);
			}

			function Probe({
				selector,
			}: {
				readonly selector: (state: FluxActionState) => boolean;
			}): React.ReactNode {
				const isSelected = useAction(selector);
				return <textlabel Text={`selected:${tostring(isSelected)}`} />;
			}

			const { queryByText, rerender } = render(<Host selector={selectJump} />);
			expect(queryByText("selected:true")).toBeDefined();

			rerender(<Host selector={selectInteract} />);

			expect(queryByText("selected:false")).toBeDefined();
		});

		it("should read the replacement Provider handle before the next flush", () => {
			expect.assertions(3);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handleA = core.register(new Instance("Folder"), "gameplay");
			const handleB = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;
			const Probe = createLabeledJumpProbe(useAction);

			core.simulateAction(handleA, "jump", true);
			core.update(FRAME_TIME);

			function Host({ handle }: { readonly handle: InputHandle }): React.ReactNode {
				return (
					<FluxProvider core={core} handle={handle}>
						<Probe label="probe" />
					</FluxProvider>
				);
			}

			const { queryByText, rerender } = render(<Host handle={handleA} />);

			flux.flush();

			expect(queryByText("probe:true")).toBeDefined();

			rerender(<Host handle={handleB} />);

			expect(queryByText("probe:false")).toBeDefined();

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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
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
				<FluxProvider core={core} handle={defaultHandle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;

			function Probe(): React.ReactNode {
				const isDefaultJump = useAction((state) => state.pressed("jump"));
				const isExplicitJump = useAction(explicitHandle, (state) => state.pressed("jump"));
				return (
					<textlabel Text={`${tostring(isDefaultJump)}|${tostring(isExplicitJump)}`} />
				);
			}

			const { queryByText } = render(
				<FluxProvider core={core} handle={defaultHandle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;

			core.simulateAction(explicitHandle, "jump", true);
			core.update(FRAME_TIME);

			function Explicit(): React.ReactNode {
				const isJumping = useAction(explicitHandle, (state) => state.pressed("jump"));
				return <textlabel Text={`explicit:${tostring(isJumping)}`} />;
			}

			function Host({ handle }: { readonly handle: InputHandle }): React.ReactNode {
				return (
					<FluxProvider core={core} handle={handle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const Probe = createLabeledJumpProbe(flux.useAction);

			const { queryByText } = render(
				<flux.FluxProvider core={core} handle={handle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const Probe = createLabeledJumpProbe(flux.useAction);

			const { queryByText } = render(
				<flux.FluxProvider core={core} handle={handle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;

			function ChargeProbe(): React.ReactNode {
				const isCharging = useAction((state) => state.pressed("charge"));
				return <textlabel Text={`charge:${tostring(isCharging)}`} />;
			}

			const { queryByText } = render(
				<FluxProvider core={core} handle={handle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;

			function DashProbe(): React.ReactNode {
				const isDashing = useAction((state) => state.pressed("dash"));
				return <textlabel Text={`dash:${tostring(isDashing)}`} />;
			}

			const { queryByText } = render(
				<FluxProvider core={core} handle={handle}>
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

		it("should render a claimed action as inert", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;
			const Probe = createLabeledJumpProbe(useAction);

			const { queryByText } = render(
				<FluxProvider core={core} handle={handle}>
					<Probe label="jump" />
				</FluxProvider>,
			);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);
			flux.flush();

			expect(queryByText("jump:true")).toBeDefined();

			core.getState(handle).claim("jump");
			flux.flush();

			expect(queryByText("jump:false")).toBeDefined();
		});

		it("should clear gameplay bindings when a sinking ui context is active", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;
			const Probe = createLabeledJumpProbe(useAction);

			const { queryByText } = render(
				<FluxProvider core={core} handle={handle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;
			const probe = createCountingProbe(useAction, (state) => state.pressed("jump"));
			const Probe = probe.component;

			render(
				<FluxProvider core={core} handle={handle}>
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
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useAction } = flux;
			const Probe = createLabeledJumpProbe(useAction);

			const { queryByText, unmount } = render(
				<StrictMode>
					<FluxProvider core={core} handle={handle}>
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
	describe("flush publication", () => {
		it("should publish a first-mount flush before any listener subscribes", () => {
			expect.assertions(3);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const { flush, FluxProvider, useAction } = createFluxReact<
				typeof TEST_ACTIONS,
				TestContexts
			>();
			const committed = makeLog<boolean>();
			const selectJump = (state: FluxActionState): boolean => state.pressed("jump");

			function Probe(): React.ReactNode {
				const isJumping = useAction(selectJump);
				unstable_yieldValue(`read:${tostring(isJumping)}`);
				useLayoutEffect(() => {
					committed.push(isJumping);
				}, [isJumping]);
				return <textlabel Text={`jump:${tostring(isJumping)}`} />;
			}

			function Tail(): React.ReactNode {
				unstable_yieldValue("tail");
				return undefined;
			}

			// Mounted outside `act`, so the work loop can stop after Probe has
			// read but before its effects subscribe.
			const container = new Instance("Folder");
			const root = ReactRoblox.createRoot(container);
			unstable_clearYields();
			afterThis(() => {
				ReactRoblox.act(() => {
					root.unmount();
				});
				container.Destroy();
				unstable_clearYields();
			});

			root.render(
				<FluxProvider core={core} handle={handle}>
					<Probe />
					<Tail />
				</FluxProvider>,
			);
			unstable_flushNumberOfYields(1);
			expect(unstable_clearYields()).toEqual(["read:false"]);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);
			flush();
			ReactRoblox.act(() => {});

			// The shim has no pre-commit consistency check, so the stale read
			// commits once before its layout effect heals it.
			expect(queryInContainer(container, "jump:true")).toBeDefined();
			expect(committed.entries()).toEqual([false, true]);
		});
	});

	describe("native store hook", () => {
		it("should preserve the committed fresh-table selection after an alternate reader is abandoned", () => {
			expect.assertions(7);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const { FluxProvider, useAction } = NativeStack.FluxReact.createFluxReact<
				typeof TEST_ACTIONS,
				TestContexts
			>();
			const selections = makeLog<JumpSelection>();
			const commits = makeLog<string>();
			const originalCalls = makeRenderCounter();
			const alternateCalls = makeRenderCounter();
			const renders = makeRenderCounter();
			const selectOriginal: JumpSelector = (state) => {
				originalCalls.tick();
				return [state.pressed("jump")];
			};

			const selectAlternate: JumpSelector = (state) => {
				alternateCalls.tick();
				return [state.pressed("interact")];
			};

			function Probe({ selector }: { readonly selector: JumpSelector }): React.ReactNode {
				const selection = useAction(selector);
				renders.tick();
				NativeStack.Scheduler.unstable_yieldValue(
					selector === selectOriginal ? "original" : "alternate",
				);
				NativeStack.React.useLayoutEffect(() => {
					selections.push(selection);
				}, [selection]);
				NativeStack.React.useLayoutEffect(() => {
					commits.push(selector === selectOriginal ? "original" : "alternate");
				});
				return NativeStack.React.createElement("TextLabel", {
					Text: `jump:${tostring(selection[0])}`,
				});
			}

			function Tail(): React.ReactNode {
				NativeStack.Scheduler.unstable_yieldValue("tail");
				return undefined;
			}

			function tree(selector: JumpSelector): React.ReactElement {
				return NativeStack.React.createElement(
					FluxProvider,
					{ core, handle },
					NativeStack.React.createElement(Probe, { selector }),
					NativeStack.React.createElement(Tail),
				);
			}

			const { container, root } = createNativeRoot();
			NativeStack.ReactRoblox.act(() => {
				root.render(tree(selectOriginal));
			});
			const originalSelection = selections.entries()[0];
			NativeStack.Scheduler.unstable_clearYields();

			root.render(tree(selectAlternate));
			NativeStack.Scheduler.unstable_flushNumberOfYields(1);

			expect(NativeStack.Scheduler.unstable_clearYields()).toEqual(["alternate"]);
			expect(commits.entries()).toEqual(["original"]);

			NativeStack.ReactRoblox.act(() => {
				NativeStack.ReactRoblox.flushSync(() => {
					root.render(tree(selectOriginal));
				});
			});

			expect(queryInContainer(container, "jump:false")).toBeDefined();
			expect(selections.entries()[selections.entries().size() - 1]).toBe(originalSelection);
			expect(originalCalls.get()).toBe(1);
			expect(alternateCalls.get()).toBe(1);
			expect({ commits: commits.entries(), renders: renders.get() }).toEqual({
				commits: ["original", "original"],
				renders: 3,
			});
		});

		it("should publish a first-mount flush before any listener subscribes", () => {
			expect.assertions(3);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const { flush, FluxProvider, useAction } = NativeStack.FluxReact.createFluxReact<
				typeof TEST_ACTIONS,
				TestContexts
			>();
			const committed = makeLog<boolean>();
			const selectJump = (state: FluxActionState): boolean => state.pressed("jump");

			function Probe(): React.ReactNode {
				const isJumping = useAction(selectJump);
				NativeStack.Scheduler.unstable_yieldValue(`read:${tostring(isJumping)}`);
				NativeStack.React.useLayoutEffect(() => {
					committed.push(isJumping);
				}, [isJumping]);
				return NativeStack.React.createElement("TextLabel", {
					Text: `jump:${tostring(isJumping)}`,
				});
			}

			function Tail(): React.ReactNode {
				NativeStack.Scheduler.unstable_yieldValue("tail");
				return undefined;
			}

			const { container, root } = createNativeRoot();
			root.render(
				NativeStack.React.createElement(
					FluxProvider,
					{ core, handle },
					NativeStack.React.createElement(Probe),
					NativeStack.React.createElement(Tail),
				),
			);
			NativeStack.Scheduler.unstable_flushNumberOfYields(1);
			expect(NativeStack.Scheduler.unstable_clearYields()).toEqual(["read:false"]);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);
			flush();
			NativeStack.ReactRoblox.act(() => {});

			expect(queryInContainer(container, "jump:true")).toBeDefined();
			expect(committed.entries()).toEqual([true]);
		});

		it("should produce one fresh-table snapshot for each flush", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const { flush, FluxProvider, useAction } = NativeStack.FluxReact.createFluxReact<
				typeof TEST_ACTIONS,
				TestContexts
			>();
			const renders = makeRenderCounter();
			const selectJump: JumpSelector = (state) => [state.pressed("jump")];

			function Probe(): React.ReactNode {
				const selection = useAction(selectJump);
				renders.tick();
				return NativeStack.React.createElement("TextLabel", {
					Text: `jump:${tostring(selection[0])}`,
				});
			}

			const { container, root } = createNativeRoot();
			NativeStack.ReactRoblox.act(() => {
				root.render(
					NativeStack.React.createElement(
						FluxProvider,
						{ core, handle },
						NativeStack.React.createElement(Probe),
					),
				);
			});

			for (let index = 0; index < 3; index += 1) {
				NativeStack.ReactRoblox.act(() => {
					core.update(FRAME_TIME);
					flush();
				});
			}

			expect(queryInContainer(container, "jump:false")).toBeDefined();
			expect(renders.get()).toBe(4);
		});

		it("should keep an unchanged primitive selection across flushes", () => {
			expect.assertions(2);

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const { flush, FluxProvider, useAction } = NativeStack.FluxReact.createFluxReact<
				typeof TEST_ACTIONS,
				TestContexts
			>();
			const renders = makeRenderCounter();
			const selectJump = (state: FluxActionState): boolean => state.pressed("jump");

			function Probe(): React.ReactNode {
				const isJumping = useAction(selectJump);
				renders.tick();
				return NativeStack.React.createElement("TextLabel", {
					Text: `jump:${tostring(isJumping)}`,
				});
			}

			const { container, root } = createNativeRoot();
			NativeStack.ReactRoblox.act(() => {
				root.render(
					NativeStack.React.createElement(
						FluxProvider,
						{ core, handle },
						NativeStack.React.createElement(Probe),
					),
				);
			});

			NativeStack.ReactRoblox.act(() => {
				core.simulateAction(handle, "jump", true);
				core.update(FRAME_TIME);
				flush();
			});

			for (let index = 0; index < 3; index += 1) {
				NativeStack.ReactRoblox.act(() => {
					core.simulateAction(handle, "jump", true);
					core.update(FRAME_TIME);
					flush();
				});
			}

			expect(queryInContainer(container, "jump:true")).toBeDefined();
			expect(renders.get()).toBe(2);
		});
	});
});
