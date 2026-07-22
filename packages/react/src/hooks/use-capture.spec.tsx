/* eslint-disable flawless/naming-convention -- React components use PascalCase */
import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import type { CaptureToken, FluxCore, InputHandle } from "@rbxts/flux";
import { createCore } from "@rbxts/flux";
import { describe, expect, it, jest } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React, { StrictMode, useEffect } from "@rbxts/react";

import type { TestContexts } from "#test/fixtures";
import { FRAME_TIME, TEST_ACTIONS, TEST_CONTEXTS } from "#test/fixtures";
import type { Log, RenderCounter } from "#test/probes";
import { makeLog, makeRenderCounter } from "#test/probes";
import type { FluxReact } from "../create-flux-react";
import { createFluxReact } from "../create-flux-react";
import type { CaptureTokenLike } from "./use-capture";

_G.__DEV__ = true;

/** The FluxReact instance the integration fixtures are bound to. */
type TestFlux = FluxReact<typeof TEST_ACTIONS, TestContexts>;

/** A capture token for the fixture's plain Bool action. */
type JumpToken = CaptureToken<typeof TEST_ACTIONS, "jump">;

/** Props naming the Bool action a surface should capture. */
interface ActionProps {
	/** The action the surface captures on this render. */
	readonly action: "charge" | "interact" | "jump";
}

/** What a surface read through its token during one render. */
interface ActionReads {
	/** Whether the token reported a cancel. */
	readonly canceled: boolean;
	/** The token's typed value. */
	readonly getState: boolean;
	/** Whether the token reported the action as pressed. */
	readonly pressed: boolean;
}

/** Props naming the action a kind-changing surface should capture. */
interface KindProps {
	/** The action the surface captures on this render. */
	readonly action: "jump" | "move";
}

/** Props gating whether a mounted surface holds its capture. */
interface EnabledProps {
	/** Whether the surface holds the capture on this render. */
	readonly enabled: boolean;
}

/** Props naming the sibling surfaces that are currently mounted. */
interface LiveProps {
	/** One id per mounted sibling; dropping an id unmounts that sibling. */
	readonly live: ReadonlyArray<string>;
}

/** Props for surfaces that render a caller-supplied tag. */
interface TaggedProps {
	/** Text rendered by the surface, used to force a re-render. */
	readonly tag: string;
}

/**
 * Builds a surface that captures `jump`, records the token it was handed on
 * every render, and renders its `tag` prop so re-renders are observable.
 *
 * @param useCapture - The `useCapture` hook from a specific FluxReact instance.
 * @param log - Log receiving one token per render.
 * @returns The surface component.
 */
function createTokenLoggingSurface(
	useCapture: TestFlux["useCapture"],
	log: Log<JumpToken>,
): (props: TaggedProps) => React.ReactNode {
	return ({ tag }: TaggedProps): React.ReactNode => {
		log.push(useCapture("jump"));
		return <textlabel Text={tag} />;
	};
}

/**
 * Wraps a surface that captures whichever action its props name, recording
 * what the token reads during every render.
 *
 * @param flux - The FluxReact instance supplying the Provider and hook.
 * @param core - The core the Provider hands to hooks.
 * @param handle - The default handle the Provider hands to hooks.
 * @param reads - Log receiving one set of token reads per render.
 * @returns The host component.
 */
function createActionHost(
	{ FluxProvider, useCapture }: TestFlux,
	core: FluxCore<typeof TEST_ACTIONS, TestContexts>,
	handle: InputHandle,
	reads: Log<ActionReads>,
): (props: ActionProps) => React.ReactNode {
	function Surface({ action }: ActionProps): React.ReactNode {
		const token = useCapture(action);
		reads.push({
			canceled: token.canceled(),
			getState: token.getState(),
			pressed: token.pressed(),
		});
		return <frame />;
	}

	return ({ action }: ActionProps): React.ReactNode => {
		return (
			<FluxProvider core={core} handle={handle}>
				<Surface action={action} />
			</FluxProvider>
		);
	};
}

/**
 * Wraps a surface whose captured action changes kind, recording the token's
 * `getState()` on every render.
 *
 * @param flux - The FluxReact instance supplying the Provider and hook.
 * @param core - The core the Provider hands to hooks.
 * @param handle - The default handle the Provider hands to hooks.
 * @param reads - Log receiving one `getState()` read per render.
 * @returns The host component.
 */
function createKindHost(
	{ FluxProvider, useCapture }: TestFlux,
	core: FluxCore<typeof TEST_ACTIONS, TestContexts>,
	handle: InputHandle,
	reads: Log<boolean | Vector2>,
): (props: KindProps) => React.ReactNode {
	function Surface({ action }: KindProps): React.ReactNode {
		const token = useCapture(action);
		reads.push(token.getState());
		return <frame />;
	}

	return ({ action }: KindProps): React.ReactNode => {
		return (
			<FluxProvider core={core} handle={handle}>
				<Surface action={action} />
			</FluxProvider>
		);
	};
}

/**
 * Wraps a tagged surface in a FluxProvider, forwarding the tag so a re-render
 * can be driven from the root.
 *
 * @param flux - The FluxReact instance supplying the Provider.
 * @param core - The core the Provider hands to hooks.
 * @param handle - The default handle the Provider hands to hooks.
 * @param Surface - The surface rendered under the Provider.
 * @returns The host component.
 */
function createTaggedHost(
	{ FluxProvider }: TestFlux,
	core: FluxCore<typeof TEST_ACTIONS, TestContexts>,
	handle: InputHandle,
	Surface: (props: TaggedProps) => React.ReactNode,
): (props: TaggedProps) => React.ReactNode {
	return ({ tag }: TaggedProps): React.ReactNode => {
		return (
			<FluxProvider core={core} handle={handle}>
				<Surface tag={tag} />
			</FluxProvider>
		);
	};
}

/**
 * Builds an inert stand-in for a capture token, for the cases that need a
 * token-shaped argument without a Provider to capture through.
 *
 * @returns A token whose reads are all inert.
 */
function makeTokenStub(): CaptureTokenLike {
	return {
		canceled(): boolean {
			return false;
		},
		claim(): boolean {
			return false;
		},
		currentDuration(): number {
			return 0;
		},
		ongoing(): boolean {
			return false;
		},
		previousDuration(): number {
			return 0;
		},
		release(): void {},
		triggered(): boolean {
			return false;
		},
	};
}

/**
 * Wraps one `jump`-capturing surface per entry of `live` in a FluxProvider, so
 * siblings can be unmounted in any order by dropping ids.
 *
 * @param flux - The FluxReact instance supplying the Provider and hook.
 * @param core - The core the Provider hands to hooks.
 * @param handle - The default handle the Provider hands to hooks.
 * @returns The host component.
 */
function createSiblingHost(
	{ FluxProvider, useCapture }: TestFlux,
	core: FluxCore<typeof TEST_ACTIONS, TestContexts>,
	handle: InputHandle,
): (props: LiveProps) => React.ReactNode {
	function Surface(): React.ReactNode {
		useCapture("jump");
		return <frame />;
	}

	return ({ live }: LiveProps): React.ReactNode => {
		return (
			<FluxProvider core={core} handle={handle}>
				{live.map((id) => {
					return <Surface key={id} />;
				})}
			</FluxProvider>
		);
	};
}

/**
 * Wraps a surface whose capture is gated by an `enabled` prop, so ownership can
 * be dropped and retaken without the surface ever unmounting.
 *
 * @param flux - The FluxReact instance supplying the Provider and hook.
 * @param core - The core the Provider hands to hooks.
 * @param handle - The default handle the Provider hands to hooks.
 * @param reads - Log receiving one set of token reads per render.
 * @returns The host component.
 */
function createToggleHost(
	{ FluxProvider, useCapture }: TestFlux,
	core: FluxCore<typeof TEST_ACTIONS, TestContexts>,
	handle: InputHandle,
	reads: Log<ActionReads>,
): (props: EnabledProps) => React.ReactNode {
	function Surface({ enabled }: EnabledProps): React.ReactNode {
		const token = useCapture("jump", { enabled });
		reads.push({
			canceled: token.canceled(),
			getState: token.getState(),
			pressed: token.pressed(),
		});
		return <frame />;
	}

	return ({ enabled }: EnabledProps): React.ReactNode => {
		return (
			<FluxProvider core={core} handle={handle}>
				<Surface enabled={enabled} />
			</FluxProvider>
		);
	};
}

/**
 * Wraps an `enabled`-gated surface that records the token it was handed on
 * every render, so reads can be driven from outside the tree after a commit.
 *
 * @param flux - The FluxReact instance supplying the Provider and hook.
 * @param core - The core the Provider hands to hooks.
 * @param handle - The default handle the Provider hands to hooks.
 * @param log - Log receiving one token per render.
 * @returns The host component.
 */
function createTogglingTokenHost(
	{ FluxProvider, useCapture }: TestFlux,
	core: FluxCore<typeof TEST_ACTIONS, TestContexts>,
	handle: InputHandle,
	log: Log<JumpToken>,
): (props: EnabledProps) => React.ReactNode {
	function Surface({ enabled }: EnabledProps): React.ReactNode {
		log.push(useCapture("jump", { enabled }));
		return <frame />;
	}

	return ({ enabled }: EnabledProps): React.ReactNode => {
		return (
			<FluxProvider core={core} handle={handle}>
				<Surface enabled={enabled} />
			</FluxProvider>
		);
	};
}

/**
 * Builds a surface that captures `jump` and renders it through
 * `useCaptureAction`, tracking how many times it has rendered.
 *
 * @param flux - The FluxReact instance supplying both hooks.
 * @param counter - Counter ticked once per render.
 * @returns The surface component.
 */
function createReadingSurface(flux: TestFlux, counter: RenderCounter): () => React.ReactNode {
	return (): React.ReactNode => {
		counter.tick();
		const token = flux.useCapture("jump");
		const isPressed = flux.useCaptureAction(token, (owned) => owned.pressed());
		return <textlabel Text={`jump:${tostring(isPressed)}`} />;
	};
}

describe("useCapture", () => {
	describe("lifecycle", () => {
		it("should capture on mount and release on unmount", () => {
			expect.assertions(3);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const state = core.getState(handle);

			function Surface(): React.ReactNode {
				useCapture("jump");
				return <frame />;
			}

			const { unmount } = render(
				<FluxProvider core={core} handle={handle}>
					<Surface />
				</FluxProvider>,
			);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			// The surface holds the capture, so an outside reader is inert.
			expect(state.pressed("jump")).toBeFalse();
			expect(state.rawPressed("jump")).toBeTrue();

			core.simulateAction(handle, "jump", false);
			core.update(FRAME_TIME);
			unmount();

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			expect(state.pressed("jump")).toBeTrue();
		});

		it("should return a defined token that reads inert before the effect runs", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const tokens = makeLog<JumpToken>();
			const reads = makeLog<boolean>();

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			function Surface(): React.ReactNode {
				const token = useCapture("jump");
				tokens.push(token);
				reads.push(token.pressed());
				return <frame />;
			}

			render(
				<FluxProvider core={core} handle={handle}>
					<Surface />
				</FluxProvider>,
			);

			expect(tokens.entries()[0]).toBeDefined();
			expect(reads.entries()[0]).toBeFalse();
		});

		it("should keep the token identity stable across re-renders", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const log = makeLog<JumpToken>();
			const Host = createTaggedHost(
				flux,
				core,
				handle,
				createTokenLoggingSurface(flux.useCapture, log),
			);

			const { rerender } = render(<Host tag="a" />);

			rerender(<Host tag="b" />);

			const tokens = log.entries();

			expect(tokens.size()).toBe(2);
			expect(tokens[0]).toBe(tokens[1]);
		});

		it("should not cost an extra render to acquire the capture", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const counter = makeRenderCounter();

			function Surface(): React.ReactNode {
				counter.tick();
				useCapture("jump");
				return <frame />;
			}

			render(
				<FluxProvider core={core} handle={handle}>
					<Surface />
				</FluxProvider>,
			);

			expect(counter.get()).toBe(1);
		});

		it("should not re-capture when the component re-renders", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const spy = jest.spyOn(core.getState(handle), "capture");
			const Host = createTaggedHost(
				flux,
				core,
				handle,
				createTokenLoggingSurface(flux.useCapture, makeLog<JumpToken>()),
			);

			const { rerender } = render(<Host tag="a" />);

			expect(spy).toHaveBeenCalledOnce();

			rerender(<Host tag="b" />);
			rerender(<Host tag="c" />);

			expect(spy).toHaveBeenCalledOnce();
		});

		it("should release the old action and capture the new one when the action changes", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const state = core.getState(handle);
			const Host = createActionHost(flux, core, handle, makeLog<ActionReads>());

			function readOutside(): Record<string, boolean> {
				return { interact: state.pressed("interact"), jump: state.pressed("jump") };
			}

			const { rerender } = render(<Host action="jump" />);

			core.simulateAction(handle, "jump", true);
			core.simulateAction(handle, "interact", true);
			core.update(FRAME_TIME);

			expect(readOutside()).toStrictEqual({ interact: true, jump: false });

			core.simulateAction(handle, "jump", false);
			core.simulateAction(handle, "interact", false);
			core.update(FRAME_TIME);

			rerender(<Host action="interact" />);

			core.simulateAction(handle, "jump", true);
			core.simulateAction(handle, "interact", true);
			core.update(FRAME_TIME);

			expect(readOutside()).toStrictEqual({ interact: false, jump: true });
		});

		it("should leave the newer sibling owning the action when the older unmounts", () => {
			expect.assertions(4);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
			});
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const state = core.getState(handle);
			const Host = createSiblingHost(flux, core, handle);

			const { rerender } = render(<Host live={["first", "second"]} />);

			expect(state.debugCaptures("jump").size()).toBe(2);

			rerender(<Host live={["second"]} />);

			expect(state.debugCaptures("jump").size()).toBe(1);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			// The survivor still owns the action, so outsiders read inert.
			expect(state.pressed("jump")).toBeFalse();

			rerender(<Host live={[]} />);

			expect(state.debugCaptures("jump").size()).toBe(0);
		});

		it("should leave the older sibling owning the action when the newer unmounts", () => {
			expect.assertions(3);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
			});
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const state = core.getState(handle);
			const Host = createSiblingHost(flux, core, handle);

			const { rerender } = render(<Host live={["first", "second"]} />);

			// Dropping the newest holder is the out-of-order release: the
			// older sibling underneath is restored as the owner.
			rerender(<Host live={["first"]} />);

			expect(state.debugCaptures("jump").size()).toBe(1);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			expect(state.pressed("jump")).toBeFalse();
			expect(state.rawPressed("jump")).toBeTrue();
		});

		it("should net exactly one live capture under StrictMode", () => {
			expect.assertions(3);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
			});
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const state = core.getState(handle);
			const log = makeLog<JumpToken>();
			const Surface = createTokenLoggingSurface(useCapture, log);

			// `debugRenderPhaseSideEffectsForStrictMode` is on under `__DEV__`
			// (react-lua `@rbxts-js/shared/src/ReactFeatureFlags.lua:43`), so
			// the render phase really is double-invoked here: the hook's
			// `useState` initializers run twice and must still net one
			// capture. Effects are not double-invoked —
			// `enableDoubleInvokingEffects = false` (same file, line 140), and
			// react-lua 17.3.7 is a React 17 fork with no `StrictEffects` — so
			// the mount/cleanup/mount ordering is covered by the key-remount
			// test below.
			const { unmount } = render(
				<StrictMode>
					<FluxProvider core={core} handle={handle}>
						<Surface tag="strict" />
					</FluxProvider>
				</StrictMode>,
			);

			expect(state.debugCaptures("jump").size()).toBe(1);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			// The one live capture is the token the surface is rendering with.
			expect(log.entries()[0]!.pressed()).toBeTrue();

			unmount();

			expect(state.debugCaptures("jump").size()).toBe(0);
		});

		it("should net exactly one live capture across a mount, cleanup, mount cycle", () => {
			expect.assertions(3);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
			});
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const state = core.getState(handle);
			const depths = makeLog<number>();
			const spy = jest.spyOn(state, "capture");

			function Surface(): React.ReactNode {
				useCapture("jump");

				// Declared after `useCapture`, so this effect runs after the
				// capture effect and its cleanup runs after the release —
				// sampling the live stack depth at every mount boundary.
				useEffect(() => {
					depths.push(state.debugCaptures("jump").size());
					return () => {
						depths.push(state.debugCaptures("jump").size());
					};
				}, []);

				return <frame />;
			}

			function Host({ generation }: { readonly generation: string }): React.ReactNode {
				return (
					<FluxProvider core={core} handle={handle}>
						<Surface key={generation} />
					</FluxProvider>
				);
			}

			// React-Lua does not double-invoke effects
			// (`enableDoubleInvokingEffects = false`, react-lua
			// `@rbxts-js/shared/src/ReactFeatureFlags.lua:140`), so the
			// double-mount ordering is driven here with a key remount: the old
			// instance's cleanup and the new instance's setup land in the same
			// commit. Unlike a React 18 StrictMode replay this mounts a fresh
			// fiber, so it pins the ordering and the net, not the refs being
			// reused; a react-lua bump that flips that flag should replace it.
			const { rerender } = render(<Host generation="first" />);

			rerender(<Host generation="second" />);

			expect(depths.entries()).toStrictEqual([1, 0, 1]);
			expect(spy).toHaveBeenCalledTimes(2);
			expect(state.debugCaptures("jump").size()).toBe(1);
		});

		it("should read inert after unmount rather than erroring", () => {
			expect.assertions(3);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const log = makeLog<JumpToken>();
			const Surface = createTokenLoggingSurface(useCapture, log);

			const { unmount } = render(
				<FluxProvider core={core} handle={handle}>
					<Surface tag="surface" />
				</FluxProvider>,
			);

			unmount();

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			const token = log.entries()[0]!;

			// A late read during teardown is inert, never an error and never
			// a live view of an action this surface no longer owns.
			expect(() => token.pressed()).never.toThrow();
			expect(token.pressed()).toBeFalse();
			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should not let a released token claim the action after unmount", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const log = makeLog<JumpToken>();
			const Surface = createTokenLoggingSurface(flux.useCapture, log);

			const { unmount } = render(
				<flux.FluxProvider core={core} handle={handle}>
					<Surface tag="surface" />
				</flux.FluxProvider>,
			);

			unmount();

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			expect(log.entries()[0]!.claim()).toBeFalse();

			// The stale claim must not suppress the readers that are still up.
			expect(core.getState(handle).pressed("jump")).toBeTrue();
		});

		it("should read inert during the commit where the action changes", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const reads = makeLog<ActionReads>();
			const Host = createActionHost(flux, core, handle, reads);

			const { rerender } = render(<Host action="jump" />);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			// A render that still asks for "jump" sees the live press.
			rerender(<Host action="jump" />);

			expect(reads.entries()[1]).toStrictEqual({
				canceled: false,
				getState: true,
				pressed: true,
			});

			// The render that asks for "interact" must report nothing of it.
			rerender(<Host action="interact" />);

			expect(reads.entries()[2]).toStrictEqual({
				canceled: false,
				getState: false,
				pressed: false,
			});
		});

		it("should deliver a cancel raised while the action is unchanged", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const reads = makeLog<ActionReads>();
			const Host = createActionHost(flux, core, handle, reads);

			const { rerender } = render(<Host action="jump" />);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			// A newer capture displaces the surface's token mid-press, which
			// is what raises the one-frame boundary cancel.
			core.getState(handle).capture("jump");
			rerender(<Host action="jump" />);

			expect(reads.entries()[1]!.canceled).toBeTrue();
		});

		it("should not report the previous action's cancel when the action changes", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const reads = makeLog<ActionReads>();
			const Host = createActionHost(flux, core, handle, reads);

			const { rerender } = render(<Host action="jump" />);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);
			core.getState(handle).capture("jump");

			// Same pending cancel as the test above, but this render asks for
			// a different action and must not be handed "jump"'s cancel.
			rerender(<Host action="interact" />);

			expect(reads.entries()[1]!.canceled).toBeFalse();
		});

		it("should report the new action's neutral value when the kind changes", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const reads = makeLog<boolean | Vector2>();
			const Host = createKindHost(flux, core, handle, reads);

			const { rerender } = render(<Host action="jump" />);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			// The commit that switches to a Direction2D action must report
			// that kind's neutral value, not the Bool action's.
			rerender(<Host action="move" />);

			expect(reads.entries()[1]).toBe(Vector2.zero);

			rerender(<Host action="jump" />);

			expect(reads.entries()[2]).toBeFalse();
		});

		it("should treat a second release as a no-op", () => {
			expect.assertions(3);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
			});
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const state = core.getState(handle);
			const log = makeLog<JumpToken>();
			const Host = createSiblingHost(flux, core, handle);
			const Surface = createTokenLoggingSurface(flux.useCapture, log);

			render(
				<flux.FluxProvider core={core} handle={handle}>
					<Surface tag="surface" />
				</flux.FluxProvider>,
			);

			const token = log.entries()[0]!;
			token.release();

			expect(state.debugCaptures("jump").size()).toBe(0);

			// A second release must not pop a stack slot it no longer owns.
			render(<Host live={["other"]} />);

			expect(() => {
				token.release();
			}).never.toThrow();
			expect(state.debugCaptures("jump").size()).toBe(1);
		});

		it("should still deliver the one-frame canceled() after release", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const log = makeLog<JumpToken>();
			const Surface = createTokenLoggingSurface(useCapture, log);

			const { unmount } = render(
				<FluxProvider core={core} handle={handle}>
					<Surface tag="surface" />
				</FluxProvider>,
			);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			unmount();

			expect(log.entries()[0]!.canceled()).toBeTrue();
		});

		it("should raise the provider assertion when used outside a FluxProvider", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const { useCapture } = createFluxReact<typeof TEST_ACTIONS, TestContexts>();

			function Surface(): React.ReactNode {
				useCapture("jump");
				return <frame />;
			}

			expect(() => render(<Surface />)).toThrow(
				"Flux hooks must be used within a FluxProvider",
			);
		});

		it("should capture on the explicitly supplied handle", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const defaultHandle = core.register(new Instance("Folder"), "gameplay");
			const explicitHandle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;

			function Surface(): React.ReactNode {
				useCapture(explicitHandle, "jump");
				return <frame />;
			}

			render(
				<FluxProvider core={core} handle={defaultHandle}>
					<Surface />
				</FluxProvider>,
			);

			core.simulateAction(defaultHandle, "jump", true);
			core.simulateAction(explicitHandle, "jump", true);
			core.update(FRAME_TIME);

			expect(core.getState(defaultHandle).pressed("jump")).toBeTrue();
			expect(core.getState(explicitHandle).pressed("jump")).toBeFalse();
		});
	});

	describe("options", () => {
		it("should not capture on mount when enabled is false", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
			});
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const state = core.getState(handle);
			const Host = createToggleHost(flux, core, handle, makeLog<ActionReads>());

			render(<Host enabled={false} />);

			expect(state.debugCaptures("jump").size()).toBe(0);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			// Nobody owns the action, so an outside reader sees the press.
			expect(state.pressed("jump")).toBeTrue();
		});

		it("should capture when enabled flips true and release when it flips false", () => {
			expect.assertions(4);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
			});
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const state = core.getState(handle);
			const Host = createToggleHost(flux, core, handle, makeLog<ActionReads>());

			const { rerender } = render(<Host enabled={false} />);

			rerender(<Host enabled={true} />);

			expect(state.debugCaptures("jump").size()).toBe(1);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			// The surface owns the action, so an outside reader is inert.
			expect(state.pressed("jump")).toBeFalse();

			core.simulateAction(handle, "jump", false);
			core.update(FRAME_TIME);
			rerender(<Host enabled={false} />);

			expect(state.debugCaptures("jump").size()).toBe(0);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			expect(state.pressed("jump")).toBeTrue();
		});

		it("should capture while mounted when enabled is omitted", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
			});
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const state = core.getState(handle);

			function Surface(): React.ReactNode {
				useCapture("jump");
				return <frame />;
			}

			render(
				<FluxProvider core={core} handle={handle}>
					<Surface />
				</FluxProvider>,
			);

			expect(state.debugCaptures("jump").size()).toBe(1);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			expect(state.pressed("jump")).toBeFalse();
		});

		it("should read inert through the token while disabled", () => {
			expect.assertions(3);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const reads = makeLog<ActionReads>();
			const Host = createToggleHost(flux, core, handle, reads);

			const { rerender } = render(<Host enabled={true} />);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);
			rerender(<Host enabled={true} />);

			expect(reads.entries()[1]!.pressed).toBeTrue();

			// The render that disables the capture must go inert in that same
			// render, not one commit later once the effect has caught up.
			rerender(<Host enabled={false} />);

			expect(reads.entries()[2]!.pressed).toBeFalse();

			rerender(<Host enabled={true} />);

			// Still inert on the render that re-enables: the capture lands in
			// the effect, so the token reads live from the next render on.
			expect(reads.entries()[3]!.pressed).toBeFalse();
		});

		it("should not leak captures across repeated enabled toggles", () => {
			expect.assertions(3);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
			});
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const state = core.getState(handle);
			const Host = createToggleHost(flux, core, handle, makeLog<ActionReads>());

			const { rerender, unmount } = render(<Host enabled={true} />);

			for (let index = 0; index < 5; index += 1) {
				rerender(<Host enabled={false} />);
				rerender(<Host enabled={true} />);
			}

			// Five full cycles net one holder, not six.
			expect(state.debugCaptures("jump").size()).toBe(1);

			rerender(<Host enabled={false} />);

			expect(state.debugCaptures("jump").size()).toBe(0);

			unmount();

			expect(state.debugCaptures("jump").size()).toBe(0);
		});

		it("should deliver the one-frame cancel when disabled mid-press", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const log = makeLog<JumpToken>();
			const Host = createTogglingTokenHost(flux, core, handle, log);

			const { rerender } = render(<Host enabled={true} />);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			// Dropping a live press is a capture boundary, so core records the
			// cancel against this very viewer. A child handed this token never
			// sees `enabled`; without the cancel it would watch `pressed()`
			// fall with no verb, indistinguishable from the user letting go.
			rerender(<Host enabled={false} />);

			const token = log.entries()[0]!;

			expect(token.canceled()).toBeTrue();

			// Every other read is still inert while disabled.
			expect(token.pressed()).toBeFalse();
		});

		it("should not report the previous action's cancel when disabled after an action change", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const reads = makeLog<ActionReads>();
			const Host = createActionHost(flux, core, handle, reads);

			const { rerender } = render(<Host action="jump" />);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);
			core.getState(handle).capture("jump");

			// The cancel-on-disable exception is scoped to the captured triple:
			// a render asking for a different action must still be handed none
			// of the previous action's cancel.
			rerender(<Host action="interact" />);

			expect(reads.entries()[1]!.canceled).toBeFalse();
		});

		it("should label the capture with debugLabel in debugCaptures", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
			});
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const state = core.getState(handle);

			function Surface(): React.ReactNode {
				useCapture("jump", { debugLabel: "pause-menu" });
				return <frame />;
			}

			render(
				<FluxProvider core={core} handle={handle}>
					<Surface />
				</FluxProvider>,
			);

			const captures = state.debugCaptures("jump");

			expect(captures.size()).toBe(1);
			expect(captures[0]!.label).toBe("pause-menu");
		});
	});

	describe("token reads", () => {
		it("should report inert Bool reads before the capture lands", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const reads = makeLog<Record<string, boolean | number>>();

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			function Surface(): React.ReactNode {
				const token = useCapture("jump");
				reads.push({
					canceled: token.canceled(),
					claim: token.claim(),
					currentDuration: token.currentDuration(),
					getState: token.getState(),
					justPressed: token.justPressed(),
					justReleased: token.justReleased(),
					ongoing: token.ongoing(),
					pressed: token.pressed(),
					previousDuration: token.previousDuration(),
					triggered: token.triggered(),
				});
				// Releasing before the capture lands is a harmless no-op.
				token.release();
				return <frame />;
			}

			render(
				<FluxProvider core={core} handle={handle}>
					<Surface />
				</FluxProvider>,
			);

			expect(reads.entries()[0]).toStrictEqual({
				canceled: false,
				claim: false,
				currentDuration: 0,
				getState: false,
				justPressed: false,
				justReleased: false,
				ongoing: false,
				pressed: false,
				previousDuration: 0,
				triggered: false,
			});
		});

		it("should report inert directional reads before the capture lands", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const reads = makeLog<Record<string, boolean | number | Vector2 | Vector3>>();

			core.simulateAction(handle, "throttle", 0.75);
			core.simulateAction(handle, "move", new Vector2(1, 0));
			core.simulateAction(handle, "fly", new Vector3(1, 0, 0));
			core.simulateAction(handle, "look", new Vector2(4, 2));
			core.update(FRAME_TIME);

			function Surface(): React.ReactNode {
				const throttle = useCapture("throttle");
				const move = useCapture("move");
				const fly = useCapture("fly");
				const look = useCapture("look");
				reads.push({
					axis1d: throttle.axis1d(),
					axis3d: fly.axis3d(),
					axisBecameActive: throttle.axisBecameActive(),
					axisBecameInactive: throttle.axisBecameInactive(),
					direction2d: move.direction2d(),
					position2d: look.position2d(),
					stateAxis1d: throttle.getState(),
					stateAxis3d: fly.getState(),
					stateDirection2d: move.getState(),
					statePosition2d: look.getState(),
				});
				return <frame />;
			}

			render(
				<FluxProvider core={core} handle={handle}>
					<Surface />
				</FluxProvider>,
			);

			expect(reads.entries()[0]).toStrictEqual({
				axis1d: 0,
				axis3d: Vector3.zero,
				axisBecameActive: false,
				axisBecameInactive: false,
				direction2d: Vector2.zero,
				position2d: Vector2.zero,
				stateAxis1d: 0,
				stateAxis3d: Vector3.zero,
				stateDirection2d: Vector2.zero,
				statePosition2d: Vector2.zero,
			});
		});

		it("should delegate Bool reads to the token once the capture lands", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const log = makeLog<JumpToken>();
			const Surface = createTokenLoggingSurface(useCapture, log);

			render(
				<FluxProvider core={core} handle={handle}>
					<Surface tag="surface" />
				</FluxProvider>,
			);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			const jump = log.entries()[0]!;

			expect({
				canceled: jump.canceled(),
				currentDuration: jump.currentDuration(),
				getState: jump.getState(),
				justPressed: jump.justPressed(),
				justReleased: jump.justReleased(),
				ongoing: jump.ongoing(),
				pressed: jump.pressed(),
				previousDuration: jump.previousDuration(),
				triggered: jump.triggered(),
			}).toStrictEqual({
				canceled: false,
				currentDuration: FRAME_TIME,
				getState: true,
				justPressed: true,
				justReleased: false,
				ongoing: false,
				pressed: true,
				previousDuration: 0,
				triggered: true,
			});
		});

		it("should delegate directional reads to the token once the capture lands", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const reads = makeLog<Record<string, boolean | number | Vector2 | Vector3>>();

			function Surface(): React.ReactNode {
				const throttle = useCapture("throttle");
				const move = useCapture("move");
				const fly = useCapture("fly");
				const look = useCapture("look");

				useEffect(() => {
					core.simulateAction(handle, "throttle", 0.75);
					core.simulateAction(handle, "move", new Vector2(1, 0));
					core.simulateAction(handle, "fly", new Vector3(1, 0, 0));
					core.simulateAction(handle, "look", new Vector2(4, 2));
					core.update(FRAME_TIME);
					reads.push({
						axis1d: throttle.axis1d(),
						axis3d: fly.axis3d(),
						axisBecameActive: throttle.axisBecameActive(),
						direction2d: move.direction2d(),
						position2d: look.position2d(),
					});
				}, [fly, look, move, throttle]);

				return <frame />;
			}

			render(
				<FluxProvider core={core} handle={handle}>
					<Surface />
				</FluxProvider>,
			);

			expect(reads.entries()[0]).toStrictEqual({
				axis1d: 0.75,
				axis3d: new Vector3(1, 0, 0),
				axisBecameActive: true,
				direction2d: new Vector2(1, 0),
				position2d: new Vector2(4, 2),
			});
		});

		it("should delegate the inactive axis edge and claim to the captured token", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const log = makeLog<CaptureToken<typeof TEST_ACTIONS, "throttle">>();

			function Surface(): React.ReactNode {
				log.push(useCapture("throttle"));
				return <frame />;
			}

			render(
				<FluxProvider core={core} handle={handle}>
					<Surface />
				</FluxProvider>,
			);

			const throttle = log.entries()[0]!;

			core.simulateAction(handle, "throttle", 0.75);
			core.update(FRAME_TIME);

			expect(throttle.claim()).toBeTrue();

			core.simulateAction(handle, "throttle", 0);
			core.update(FRAME_TIME);

			expect(throttle.axisBecameInactive()).toBeTrue();
		});

		it("should release through the token when the consumer calls release", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({
				actions: TEST_ACTIONS,
				contexts: TEST_CONTEXTS,
				debug: true,
			});
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const { FluxProvider, useCapture } = flux;
			const log = makeLog<JumpToken>();
			const Surface = createTokenLoggingSurface(useCapture, log);

			render(
				<FluxProvider core={core} handle={handle}>
					<Surface tag="surface" />
				</FluxProvider>,
			);

			log.entries()[0]!.release();

			expect(core.getState(handle).debugCaptures("jump").size()).toBe(0);
		});
	});

	describe("useCaptureAction", () => {
		it("should re-render when the selected value changes and bail out when it does not", () => {
			expect.assertions(4);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const counter = makeRenderCounter();
			const Surface = createReadingSurface(flux, counter);

			const { queryByText } = render(
				<flux.FluxProvider core={core} handle={handle}>
					<Surface />
				</flux.FluxProvider>,
			);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);
			flux.flush();

			expect(queryByText("jump:true")).toBeDefined();
			expect(counter.get()).toBe(2);

			for (let index = 0; index < 3; index += 1) {
				core.simulateAction(handle, "jump", true);
				core.update(FRAME_TIME);
				flux.flush();
			}

			expect(queryByText("jump:true")).toBeDefined();
			expect(counter.get()).toBe(2);
		});

		it("should raise the provider assertion when used outside a FluxProvider", () => {
			expect.assertions(1);

			afterThis(() => {
				cleanup();
			});

			const { useCaptureAction } = createFluxReact<typeof TEST_ACTIONS, TestContexts>();

			function Surface(): React.ReactNode {
				const value = useCaptureAction(makeTokenStub(), (token) => token.triggered());
				return <textlabel Text={tostring(value)} />;
			}

			expect(() => render(<Surface />)).toThrow(
				"Flux hooks must be used within a FluxProvider",
			);
		});

		it("should stop re-rendering after unmount", () => {
			expect.assertions(2);

			afterThis(() => {
				cleanup();
			});

			const core = createCore({ actions: TEST_ACTIONS, contexts: TEST_CONTEXTS });
			const handle = core.register(new Instance("Folder"), "gameplay");
			const flux = createFluxReact<typeof TEST_ACTIONS, TestContexts>();
			const counter = makeRenderCounter();
			const Surface = createReadingSurface(flux, counter);

			const { unmount } = render(
				<flux.FluxProvider core={core} handle={handle}>
					<Surface />
				</flux.FluxProvider>,
			);

			expect(counter.get()).toBe(1);

			unmount();

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);
			flux.flush();

			expect(counter.get()).toBe(1);
		});
	});
});
