/* eslint-disable flawless/naming-convention -- React components use PascalCase */
import type { ActionMap, ContextConfig } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";

import { createFluxReact } from "./create-flux-react";

_G.__DEV__ = true;

const TEST_ACTIONS = {
	jump: { type: "Bool" as const },
} satisfies ActionMap;

const TEST_CONTEXTS = {
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.Space],
		},
		priority: 0,
	},
} satisfies Record<string, ContextConfig>;

function getTextLabel(container: Instance): TextLabel {
	const label = container.FindFirstChildWhichIsA("TextLabel", true);
	assert(label, "Expected TextLabel in container");

	return label;
}

describe("createFluxReact", () => {
	it("should create a FluxReact instance with core and flush", () => {
		expect.assertions(3);

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const flux = createFluxReact({ core });

		expect(flux.core).toBe(core);
		expect(flux.flush).toBeFunction();
		expect(flux.useAction).toBeFunction();
	});
});

describe("useAction", () => {
	it("should render initial value and re-render on flush", () => {
		expect.assertions(2);

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const { flush, FluxProvider, useAction } = createFluxReact({ core });
		const handle = core.register(new Instance("Folder"), "gameplay");

		const container = new Instance("Folder");
		const root = ReactRoblox.createRoot(container);

		afterThis(() => {
			root.unmount();
			container.Destroy();
		});

		function JumpDisplay(): React.ReactNode {
			const isJumping = useAction((state) => state.pressed("jump"));

			return React.createElement("TextLabel", {
				Text: tostring(isJumping),
			});
		}

		ReactRoblox.act(() => {
			root.render(
				React.createElement(FluxProvider, { handle }, React.createElement(JumpDisplay)),
			);
		});

		expect(getTextLabel(container).Text).toBe("false");

		core.simulateAction(handle, "jump", true);
		core.update(0.016);

		ReactRoblox.act(() => {
			flush();
		});

		expect(getTextLabel(container).Text).toBe("true");
	});

	it("should not re-render when selector result is unchanged", () => {
		expect.assertions(1);

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const { flush, FluxProvider, useAction } = createFluxReact({ core });
		const handle = core.register(new Instance("Folder"), "gameplay");

		const container = new Instance("Folder");
		const root = ReactRoblox.createRoot(container);

		afterThis(() => {
			root.unmount();
			container.Destroy();
		});

		let renderCount = 0;

		function JumpDisplay(): React.ReactNode {
			useAction((state) => state.pressed("jump"));
			renderCount += 1;

			return React.createElement("TextLabel", { Text: "test" });
		}

		ReactRoblox.act(() => {
			root.render(
				React.createElement(FluxProvider, { handle }, React.createElement(JumpDisplay)),
			);
		});

		const initialRenderCount = renderCount;

		core.update(0.016);

		ReactRoblox.act(() => {
			flush();
		});

		expect(renderCount).toBe(initialRenderCount);
	});

	it("should use explicit handle when provided", () => {
		expect.assertions(2);

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const { flush, FluxProvider, useAction } = createFluxReact({ core });
		const defaultHandle = core.register(new Instance("Folder"), "gameplay");
		const explicitHandle = core.register(new Instance("Folder"), "gameplay");

		const container = new Instance("Folder");
		const root = ReactRoblox.createRoot(container);

		afterThis(() => {
			root.unmount();
			container.Destroy();
		});

		function JumpDisplay(): React.ReactNode {
			const isJumping = useAction(explicitHandle, (state) => state.pressed("jump"));

			return React.createElement("TextLabel", {
				Text: tostring(isJumping),
			});
		}

		ReactRoblox.act(() => {
			root.render(
				React.createElement(
					FluxProvider,
					{ handle: defaultHandle },
					React.createElement(JumpDisplay),
				),
			);
		});

		expect(getTextLabel(container).Text).toBe("false");

		core.simulateAction(explicitHandle, "jump", true);
		core.update(0.016);

		ReactRoblox.act(() => {
			flush();
		});

		expect(getTextLabel(container).Text).toBe("true");
	});
});
