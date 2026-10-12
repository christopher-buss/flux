import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import type { CaptureToken } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React, { useLayoutEffect, useState } from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";

import type { TestContexts } from "#test/fixtures";
import { FRAME_TIME, TEST_ACTIONS, TEST_CONTEXTS } from "#test/fixtures";
import type { FluxActionState } from "#test/probes";
import { makeLog, mountConcurrent } from "#test/probes";
import { createFluxReact } from "./create-flux-react";

_G.__DEV__ = true;

/** What the `useAction` sibling committed, written by its own layout effect. */
interface Committed {
	/**
	 * The value the sibling last rendered, or `undefined` before it commits.
	 */
	jumping?: boolean;
}

describe("flush batching", () => {
	it("should commit action and capture readers once for one flush", () => {
		expect.assertions(2);
		afterThis(cleanup);

		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const token = core.getState(handle).capture("jump");
		const { flush, FluxProvider, useAction, useCaptureAction } = createFluxReact<
			typeof TEST_ACTIONS,
			TestContexts
		>();
		const commits = makeLog<string>();
		const selectInteract = (state: FluxActionState): boolean => state.pressed("interact");
		const selectJump = (owned: CaptureToken<typeof TEST_ACTIONS, "jump">): boolean => {
			return owned.pressed();
		};

		function Probe(): React.ReactNode {
			const isInteracting = useAction(selectInteract);
			const isJumping = useCaptureAction(token, selectJump);
			useLayoutEffect(() => {
				commits.push(`${tostring(isInteracting)}|${tostring(isJumping)}`);
			});
			return <textlabel Text={`${tostring(isInteracting)}|${tostring(isJumping)}`} />;
		}

		const { queryByText } = render(
			<FluxProvider core={core} handle={handle}>
				<Probe />
			</FluxProvider>,
		);

		core.simulateAction(handle, "interact", true);
		core.simulateAction(handle, "jump", true);
		core.update(FRAME_TIME);
		flush();
		ReactRoblox.act(() => {});

		expect(queryByText("true|true")).toBeDefined();
		expect(commits.entries()).toEqual(["false|false", "true|true"]);
	});

	it("should commit an action reader and a store reader together", () => {
		expect.assertions(1);

		// A layout effect runs after every fiber in the same commit has its host
		// props, and a child's runs before a later sibling's. So a store reader
		// that finds the action sibling's new value in the record shares its
		// commit; a reader that finds the old value committed on its own.
		const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
		const handle = core.register(new Instance("Folder"), "gameplay");
		const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
		const { FluxProvider, useAction, useActiveContext } = flux;
		const log = makeLog<string>();

		function ActionReader({ committed }: { readonly committed: Committed }): React.ReactNode {
			const isJumping = useAction((state) => state.pressed("jump"));

			useLayoutEffect(() => {
				committed.jumping = isJumping;
			});

			return <textlabel Text={`action:${tostring(isJumping)}`} />;
		}

		function StoreReader({ committed }: { readonly committed: Committed }): React.ReactNode {
			const isMenuActive = useActiveContext("menu");

			useLayoutEffect(() => {
				log.push(tostring(committed.jumping));
			});

			return <textlabel Text={`menu:${tostring(isMenuActive)}`} />;
		}

		function App(): React.ReactNode {
			const [committed] = useState<Committed>(() => ({}));
			return (
				<FluxProvider core={core} handle={handle}>
					<ActionReader committed={committed} />
					<StoreReader committed={committed} />
				</FluxProvider>
			);
		}

		mountConcurrent(<App />);

		// One event both readers answer to: `useAction` sees the press, the store
		// reader sees the context. Without a change on both sides only one of
		// them re-renders and the record cannot tell the two shapes apart.
		core.simulateAction(handle, "jump", true);
		core.addContext(handle, "menu");
		core.update(FRAME_TIME);
		flux.flush();

		ReactRoblox.act(() => {});

		expect(log.entries()).toEqual(["false", "true"]);
	});
});
