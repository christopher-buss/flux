import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import type { InputHandle } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

import { FRAME_TIME, TEST_ACTIONS, TEST_CONTEXTS } from "../../test/fixtures";
import { makeRenderCounter } from "../../test/probes";
import { createFluxReact } from "../create-flux-react";

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

		const { queryByText, rerender } = render(
			<FluxProvider handle={handleA}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText("menu:false")).toBeDefined();

		rerender(
			<FluxProvider handle={handleB}>
				<Probe />
			</FluxProvider>,
		);
		flux.flush();

		expect(queryByText("menu:true")).toBeDefined();
	});
});
