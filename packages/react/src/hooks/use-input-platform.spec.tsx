import { act, cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import { createCore, setInputPlatformOverride } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

import type { TestContexts } from "#test/fixtures";
import { TEST_ACTIONS, TEST_CONTEXTS } from "#test/fixtures";
import { makeRenderCounter } from "#test/probes";
import { createFluxReact } from "../create-flux-react";
import { useInputPlatform } from "./use-input-platform";

_G.__DEV__ = true;

/**
 * Forces a starting platform for one test and releases it afterwards.
 *
 * Tests run off the client, where the engine has no device to report; the
 * override is what gives every reader a platform anyway.
 */
function startOnKeyboard(): void {
	setInputPlatformOverride("keyboard");
	afterThis(() => {
		cleanup();
		setInputPlatformOverride(undefined);
	});
}

function PlatformProbe(): React.ReactNode {
	return <textlabel Text={`platform:${useInputPlatform()}`} />;
}

describe("useInputPlatform", () => {
	it("should return the current platform", () => {
		expect.assertions(1);

		startOnKeyboard();

		const { queryByText } = render(<PlatformProbe />);

		expect(queryByText("platform:keyboard")).toBeDefined();
	});

	it("should re-render when the platform changes", () => {
		expect.assertions(1);

		startOnKeyboard();

		const { queryByText } = render(<PlatformProbe />);
		setInputPlatformOverride("gamepad");

		expect(queryByText("platform:gamepad")).toBeDefined();
	});

	it("should not re-render when the platform is set to what it already was", () => {
		expect.assertions(1);

		startOnKeyboard();

		const counter = makeRenderCounter();
		function Probe(): React.ReactNode {
			counter.tick();
			return <PlatformProbe />;
		}

		render(<Probe />);
		const before = counter.get();
		setInputPlatformOverride("keyboard");

		expect(counter.get()).toBe(before);
	});

	it("should stop listening once unmounted", () => {
		expect.assertions(1);

		startOnKeyboard();

		const counter = makeRenderCounter();
		function Probe(): React.ReactNode {
			counter.tick();
			return <PlatformProbe />;
		}

		const { unmount } = render(<Probe />);
		unmount();
		const before = counter.get();
		setInputPlatformOverride("gamepad");

		expect(counter.get()).toBe(before);
	});

	it("should re-read bindings for the new platform when composed with useBindings", () => {
		expect.assertions(2);

		startOnKeyboard();

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		core.rebindForPlatform(handle, "jump", "gamepad", [Enum.KeyCode.ButtonA]);
		const { FluxProvider, useBindings } = createFluxReact<typeof TEST_ACTIONS, TestContexts>();

		function Probe(): React.ReactNode {
			const platform = useInputPlatform();
			const [binding] = useBindings("jump", platform);
			return <textlabel Text={`binding:${tostring(binding)}`} />;
		}

		const { queryByText } = render(
			<FluxProvider core={core} handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		expect(queryByText(`binding:${tostring(Enum.KeyCode.Space)}`)).toBeDefined();

		// `useBindings` republishes from an effect when its platform changes,
		// so the flip has to be committed for the new bindings to land.
		act(() => {
			setInputPlatformOverride("gamepad");
		});

		expect(queryByText(`binding:${tostring(Enum.KeyCode.ButtonA)}`)).toBeDefined();
	});
});
