import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import type { InputHandle } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

import { createFluxReact } from "./create-flux-react";
import { FRAME_TIME, TEST_ACTIONS, TEST_CONTEXTS } from "./test-fixtures";
import { makeRenderCounter } from "./test-probes";

_G.__DEV__ = true;

describe("useInputContext", () => {
	it("should expose static fields from the context config", () => {
		expect.assertions(3);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useInputContext } = flux;

		function Probe(): React.ReactNode {
			const info = useInputContext("ui");
			return (
				<textlabel
					Text={`priority:${info.priority}|sink:${tostring(info.sink)}|actions:${info.actions.size()}`}
				/>
			);
		}

		const { queryByText } = render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText("priority:10|sink:true|actions:1")).toBeDefined();
		expect(queryByText("priority:0|sink:true|actions:1")).toBeUndefined();
		expect(queryByText("priority:10|sink:false|actions:1")).toBeUndefined();
	});

	it("should flip isActive on add and remove plus flush", () => {
		expect.assertions(3);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useInputContext } = flux;

		function Probe(): React.ReactNode {
			const info = useInputContext("menu");
			return <textlabel Text={`menu:${tostring(info.isActive)}`} />;
		}

		const { queryByText } = render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText("menu:false")).toBeDefined();

		core.addContext(handle, "menu");
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("menu:true")).toBeDefined();

		core.removeContext(handle, "menu");
		core.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("menu:false")).toBeDefined();
	});

	it("should keep the static slice stable across flushes that do not flip isActive", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useInputContext } = flux;

		const counter = makeRenderCounter();

		function Probe(): React.ReactNode {
			counter.tick();
			useInputContext("gameplay");
			return <frame />;
		}

		render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(counter.get()).toBe(1);

		for (let index = 0; index < 3; index += 1) {
			core.update(FRAME_TIME);
			flux.flush();
		}

		expect(counter.get()).toBe(1);
	});

	it("should respect an explicit handle override", () => {
		expect.assertions(1);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const defaultHandle = core.register(new Instance("Folder"), "gameplay");
		const explicitHandle = core.register(new Instance("Folder"), "menu");
		const flux = createFluxReact({ core });
		const { FluxProvider, useInputContext } = flux;

		function Probe(): React.ReactNode {
			const defaultInfo = useInputContext("menu");
			const explicitInfo = useInputContext(explicitHandle, "menu");
			return (
				<textlabel
					Text={`default:${tostring(defaultInfo.isActive)}|explicit:${tostring(explicitInfo.isActive)}`}
				/>
			);
		}

		const { queryByText } = render(
			<FluxProvider handle={defaultHandle}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText("default:false|explicit:true")).toBeDefined();
	});

	it("should resync after a Provider handle swap on the next flush", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handleA = core.register(new Instance("Folder"), "gameplay");
		const handleB = core.register(new Instance("Folder"), "menu");
		const flux = createFluxReact({ core });
		const { FluxProvider, useInputContext } = flux;

		function Probe(): React.ReactNode {
			const info = useInputContext("menu");
			return <textlabel Text={`menu:${tostring(info.isActive)}`} />;
		}

		function Host({ handle }: { readonly handle: InputHandle }): React.ReactNode {
			return (
				<FluxProvider handle={handle}>
					<Probe />
				</FluxProvider>
			);
		}

		const { queryByText, rerender } = render(<Host handle={handleA} />);

		expect(queryByText("menu:false")).toBeDefined();

		rerender(<Host handle={handleB} />);
		flux.flush();

		expect(queryByText("menu:true")).toBeDefined();
	});
});
