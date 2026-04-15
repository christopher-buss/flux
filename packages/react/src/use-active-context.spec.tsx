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

describe("useActiveContext", () => {
	it("should report the initial active context", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useActiveContext } = flux;

		function Probe(): React.ReactNode {
			const isGameplay = useActiveContext("gameplay");
			const isMenu = useActiveContext("menu");
			return <textlabel Text={`gameplay:${tostring(isGameplay)}|menu:${tostring(isMenu)}`} />;
		}

		const { queryByText } = render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText("gameplay:true|menu:false")).toBeDefined();
		expect(queryByText("gameplay:false|menu:true")).toBeUndefined();
	});

	it("should flip when addContext and removeContext are flushed", () => {
		expect.assertions(3);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useActiveContext } = flux;

		function Probe(): React.ReactNode {
			const isMenu = useActiveContext("menu");
			return <textlabel Text={`menu:${tostring(isMenu)}`} />;
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

	it("should respect an explicit handle override", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const defaultHandle = core.register(new Instance("Folder"), "gameplay");
		const explicitHandle = core.register(new Instance("Folder"), "menu");
		const flux = createFluxReact({ core });
		const { FluxProvider, useActiveContext } = flux;

		function Probe(): React.ReactNode {
			const isDefaultMenu = useActiveContext("menu");
			const isExplicitMenu = useActiveContext(explicitHandle, "menu");
			return (
				<textlabel
					Text={`default:${tostring(isDefaultMenu)}|explicit:${tostring(isExplicitMenu)}`}
				/>
			);
		}

		const { queryByText } = render(
			<FluxProvider handle={defaultHandle}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText("default:false|explicit:true")).toBeDefined();
		expect(queryByText("default:true|explicit:true")).toBeUndefined();
	});

	it("should not rerender when the active boolean is stable across flushes", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact({ core });
		const { FluxProvider, useActiveContext } = flux;

		const counter = makeRenderCounter();

		function Probe(): React.ReactNode {
			counter.tick();
			useActiveContext("gameplay");
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

	it("should resync after a Provider handle swap on the next flush", () => {
		expect.assertions(2);

		afterThis(() => {
			cleanup();
		});

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handleA = core.register(new Instance("Folder"), "gameplay");
		const handleB = core.register(new Instance("Folder"), "menu");
		const flux = createFluxReact({ core });
		const { FluxProvider, useActiveContext } = flux;

		function Probe(): React.ReactNode {
			const isMenu = useActiveContext("menu");
			return <textlabel Text={`menu:${tostring(isMenu)}`} />;
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
