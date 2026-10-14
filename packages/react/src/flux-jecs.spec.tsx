import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import type { FluxJecs } from "@rbxts/flux-jecs";
import { createFluxJecs } from "@rbxts/flux-jecs";
import Jecs from "@rbxts/jecs";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React, { useEffect } from "@rbxts/react";

import type { TestContexts } from "#test/fixtures";
import { FRAME_TIME, TEST_ACTIONS, TEST_CONTEXTS } from "#test/fixtures";
import { createFluxReact } from "./create-flux-react";

_G.__DEV__ = true;

type TestFluxJecs = FluxJecs<typeof TEST_ACTIONS, typeof TEST_CONTEXTS>;

function setup() {
	afterThis(() => {
		cleanup();
	});

	const world = Jecs.world();
	const fluxJecs = createFluxJecs(world, { actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
	const entity = world.entity();
	fluxJecs.register(entity, new Instance("Folder"), "gameplay");
	const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts, TestFluxJecs>();

	return { entity, flux, fluxJecs, world };
}

describe("FluxProvider with a FluxJecs source", () => {
	it("should read the Provider entity's action state", () => {
		expect.assertions(2);

		const { entity, flux, fluxJecs } = setup();
		const { FluxProvider, useAction } = flux;

		function Probe(): React.ReactNode {
			const isJumping = useAction((state) => state.pressed("jump"));
			return <textlabel Text={`jump:${tostring(isJumping)}`} />;
		}

		const { queryByText } = render(
			<FluxProvider core={fluxJecs} handle={entity}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText("jump:false")).toBeDefined();

		fluxJecs.simulateAction(entity, "jump", true);
		fluxJecs.update(FRAME_TIME);
		flux.flush();

		expect(queryByText("jump:true")).toBeDefined();
	});

	it("should hand components the wrapper and entity, so context toggles sync jecs tags", () => {
		expect.assertions(4);

		const { entity, flux, fluxJecs, world } = setup();
		const { FluxProvider, useActiveContext, useFluxCore, useFluxHandle } = flux;

		function Probe(): React.ReactNode {
			const source = useFluxCore();
			const handle = useFluxHandle();
			const isMenuActive = useActiveContext("menu");
			useEffect(() => {
				source.addContext(handle, "menu");
			}, [source, handle]);

			return (
				<textlabel
					Text={`menu:${tostring(isMenuActive)}:${tostring(source === fluxJecs)}:${tostring(handle === entity)}`}
				/>
			);
		}

		expect(world.has(entity, fluxJecs.contexts.menu)).toBeFalse();

		const { queryByText } = render(
			<FluxProvider core={fluxJecs} handle={entity}>
				<Probe />
			</FluxProvider>,
		);

		expect(world.has(entity, fluxJecs.contexts.menu)).toBeTrue();
		expect(queryByText("menu:false:true:true")).toBeDefined();

		flux.flush();

		expect(queryByText("menu:true:true:true")).toBeDefined();
	});

	it("should read bindings and context info for the Provider entity", () => {
		expect.assertions(2);

		const { entity, flux, fluxJecs } = setup();
		const { FluxProvider, useBindings, useInputContext } = flux;

		function Probe(): React.ReactNode {
			const bindings = useBindings("jump");
			const info = useInputContext("gameplay");
			return (
				<textlabel
					Text={`${tostring(bindings[0])}:${tostring(info.isActive)}:${info.priority}`}
				/>
			);
		}

		const { queryByText } = render(
			<FluxProvider core={fluxJecs} handle={entity}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText(`${tostring(Enum.KeyCode.Space)}:true:0`)).toBeDefined();

		fluxJecs.rebind(entity, "jump", [Enum.KeyCode.J]);
		flux.flush();

		expect(queryByText(`${tostring(Enum.KeyCode.J)}:true:0`)).toBeDefined();
	});

	it("should capture an action on the Provider entity", () => {
		expect.assertions(1);

		const { entity, flux, fluxJecs } = setup();
		const { FluxProvider, useCapture } = flux;

		function Probe(): React.ReactNode {
			useCapture("jump");
			return <frame />;
		}

		render(
			<FluxProvider core={fluxJecs} handle={entity}>
				<Probe />
			</FluxProvider>,
		);

		fluxJecs.simulateAction(entity, "jump", true);
		fluxJecs.update(FRAME_TIME);

		expect(fluxJecs.getState(entity).pressed("jump")).toBeFalse();
	});
});
