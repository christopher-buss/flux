import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

import { createFluxReact } from "./create-flux-react";
import { FRAME_TIME, TEST_ACTIONS, TEST_CONTEXTS } from "./test-fixtures";
import { makeRenderCounter } from "./test-probes";

_G.__DEV__ = true;

describe("useBindings", () => {
	it("should return bindings for an action", () => {
		expect.assertions(1);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useBindings } = flux;

		function Probe(): React.ReactNode {
			const bindings = useBindings("jump");
			return <textlabel Text={`count:${bindings.size()}`} />;
		}

		const { queryByText } = render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText("count:1")).toBeDefined();
	});

	it("should filter by platform when platform is provided", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useBindings } = flux;

		function Probe(): React.ReactNode {
			const keyboard = useBindings("jump", "keyboard");
			const gamepad = useBindings("jump", "gamepad");
			return (
				<frame>
					<textlabel Text={`keyboard:${keyboard.size()}`} />
					<textlabel Text={`gamepad:${gamepad.size()}`} />
				</frame>
			);
		}

		const { queryByText } = render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		// Space is a keyboard key, so keyboard should have bindings
		expect(queryByText("keyboard:1")).toBeDefined();
		// No gamepad bindings defined in the test fixtures
		expect(queryByText("gamepad:0")).toBeDefined();
	});

	it("should re-render after rebind and flush", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useBindings } = flux;

		function Probe(): React.ReactNode {
			const bindings = useBindings("jump");
			return <textlabel Text={`count:${bindings.size()}`} />;
		}

		const { queryByText } = render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText("count:1")).toBeDefined();

		core.rebind(handle, "jump", [Enum.KeyCode.ButtonA, Enum.KeyCode.Space]);
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("count:2")).toBeDefined();
	});

	it("should resync when the Provider handle is swapped", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handleA = core.register(new Instance("Folder"), "gameplay");
		const handleB = core.register(new Instance("Folder"), "gameplay");
		core.rebind(handleB, "jump", [Enum.KeyCode.ButtonA, Enum.KeyCode.Space]);
		const flux = createFluxReact({ core });
		const { FluxProvider, useBindings } = flux;

		function Probe(): React.ReactNode {
			const bindings = useBindings("jump");
			return <textlabel Text={`count:${bindings.size()}`} />;
		}

		function Host({ handle }: { readonly handle: typeof handleA }): React.ReactNode {
			return (
				<FluxProvider handle={handle}>
					<Probe />
				</FluxProvider>
			);
		}

		const { queryByText, rerender } = render(<Host handle={handleA} />);

		// handleA has 1 default binding (Space)
		expect(queryByText("count:1")).toBeDefined();

		// Swap to handleB which has 2 bindings (ButtonA + Space)
		rerender(<Host handle={handleB} />);
		flux.flush();

		expect(queryByText("count:2")).toBeDefined();
	});

	it("should not re-render when bindings have not changed", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useBindings } = flux;

		const counter = makeRenderCounter();

		function Probe(): React.ReactNode {
			counter.tick();
			useBindings("jump");
			return <frame />;
		}

		render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(counter.get()).toBe(1);

		// Flush multiple times without changing bindings
		for (let index = 0; index < 3; index += 1) {
			core.update(FRAME_TIME);
			flux.flush();
		}

		// Should still be 1 render because bindings haven't changed
		expect(counter.get()).toBe(1);
	});
});
