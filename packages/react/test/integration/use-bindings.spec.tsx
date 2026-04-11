/* eslint-disable flawless/naming-convention -- React components use PascalCase */
import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import type { BindingLike } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

import { createFluxReact } from "../../src";
import { FRAME_TIME, TEST_ACTIONS, TEST_CONTEXTS } from "./fixtures";
import { makeRenderCounter } from "./helpers/probes";

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

		let captured: ReadonlyArray<BindingLike> = [];

		function Probe(): React.ReactNode {
			captured = useBindings("jump");
			return <frame />;
		}

		render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(captured.size()).toBeGreaterThan(0);
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

		let keyboardBindings: ReadonlyArray<BindingLike> = [];
		let gamepadBindings: ReadonlyArray<BindingLike> = [];

		function Probe(): React.ReactNode {
			keyboardBindings = useBindings("jump", "keyboard");
			gamepadBindings = useBindings("jump", "gamepad");
			return <frame />;
		}

		render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		// Space is a keyboard key, so keyboard should have bindings
		expect(keyboardBindings.size()).toBeGreaterThan(0);
		// No gamepad bindings defined in the test fixtures
		expect(gamepadBindings.size()).toBe(0);
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

		let captured: ReadonlyArray<BindingLike> = [];

		function Probe(): React.ReactNode {
			captured = useBindings("jump");
			return <frame />;
		}

		render(
			<FluxProvider handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		const before = captured.size();

		core.rebind(handle, "jump", [Enum.KeyCode.ButtonA, Enum.KeyCode.Space]);
		core.update(FRAME_TIME);
		flux.flush();

		expect(before).toBe(1);
		expect(captured.size()).toBe(2);
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
