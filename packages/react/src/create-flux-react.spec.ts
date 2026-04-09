/* eslint-disable flawless/naming-convention -- React components use PascalCase */
import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import type { ActionMap, ContextConfig } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React from "@rbxts/react";

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

		afterThis(() => {
			cleanup();
		});

		function JumpDisplay(): React.ReactNode {
			const isJumping = useAction((state) => state.pressed("jump"));

			return React.createElement("TextLabel", {
				Text: tostring(isJumping),
			});
		}

		const { queryByText } = render(
			React.createElement(FluxProvider, { handle }, React.createElement(JumpDisplay)),
		);

		expect(queryByText("false")).toBeDefined();

		core.simulateAction(handle, "jump", true);
		core.update(0.016);
		flush();

		expect(queryByText("true")).toBeDefined();
	});

	it("should not re-render when selector result is unchanged", () => {
		expect.assertions(1);

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const { flush, FluxProvider, useAction } = createFluxReact({ core });
		const handle = core.register(new Instance("Folder"), "gameplay");

		afterThis(() => {
			cleanup();
		});

		let renderCount = 0;

		function JumpDisplay(): React.ReactNode {
			useAction((state) => state.pressed("jump"));
			renderCount += 1;

			return React.createElement("TextLabel", { Text: "test" });
		}

		render(React.createElement(FluxProvider, { handle }, React.createElement(JumpDisplay)));

		const initialRenderCount = renderCount;

		core.update(0.016);
		flush();

		expect(renderCount).toBe(initialRenderCount);
	});

	it("should use explicit handle when provided", () => {
		expect.assertions(2);

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const { flush, FluxProvider, useAction } = createFluxReact({ core });
		const defaultHandle = core.register(new Instance("Folder"), "gameplay");
		const explicitHandle = core.register(new Instance("Folder"), "gameplay");

		afterThis(() => {
			cleanup();
		});

		function JumpDisplay(): React.ReactNode {
			const isJumping = useAction(explicitHandle, (state) => state.pressed("jump"));

			return React.createElement("TextLabel", {
				Text: tostring(isJumping),
			});
		}

		const { queryByText } = render(
			React.createElement(
				FluxProvider,
				{ handle: defaultHandle },
				React.createElement(JumpDisplay),
			),
		);

		expect(queryByText("false")).toBeDefined();

		core.simulateAction(explicitHandle, "jump", true);
		core.update(0.016);
		flush();

		expect(queryByText("true")).toBeDefined();
	});
});
