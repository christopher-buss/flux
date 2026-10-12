import { queryByText } from "@flux/test-utils/react-testing-library-lua";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import type React from "@rbxts/react";

import type { TestContexts } from "#test/fixtures";
import { FRAME_TIME, TEST_ACTIONS, TEST_CONTEXTS } from "#test/fixtures";
import * as NativeStack from "#test/native-stack";
import type { FluxActionState } from "#test/probes";
import { makeLog, makeRenderCounter } from "#test/probes";

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

describe("useAction native snapshots", () => {
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

		expect(queryByText(container, "jump:false")).toBeDefined();
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

		expect(queryByText(container, "jump:true")).toBeDefined();
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

		expect(queryByText(container, "jump:false")).toBeDefined();
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

		expect(queryByText(container, "jump:true")).toBeDefined();
		expect(renders.get()).toBe(2);
	});
});
