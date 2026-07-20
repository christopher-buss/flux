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

_G.__DEV__ = true;

/** The FluxReact instance the integration fixtures are bound to. */
type TestFlux = FluxReact<typeof TEST_ACTIONS, TestContexts>;

/** A capture token for the fixture's plain Bool action. */
type JumpToken = CaptureToken<typeof TEST_ACTIONS, "jump">;

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
	flux: TestFlux,
	core: FluxCore<typeof TEST_ACTIONS, TestContexts>,
	handle: InputHandle,
	Surface: (props: TaggedProps) => React.ReactNode,
): (props: TaggedProps) => React.ReactNode {
	const { FluxProvider } = flux;
	return ({ tag }: TaggedProps): React.ReactNode => {
		return (
			<FluxProvider core={core} handle={handle}>
				<Surface tag={tag} />
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
			const { FluxProvider, useCapture } = flux;
			const state = core.getState(handle);

			function Surface({
				action,
			}: {
				readonly action: "interact" | "jump";
			}): React.ReactNode {
				useCapture(action);
				return <frame />;
			}

			function Host({ action }: { readonly action: "interact" | "jump" }): React.ReactNode {
				return (
					<FluxProvider core={core} handle={handle}>
						<Surface action={action} />
					</FluxProvider>
				);
			}

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

		it("should leave the surviving sibling owning the action whichever unmounts first", () => {
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
			const { FluxProvider, useCapture } = flux;
			const state = core.getState(handle);

			function Surface(): React.ReactNode {
				useCapture("jump");
				return <frame />;
			}

			function Host({ live }: { readonly live: ReadonlyArray<string> }): React.ReactNode {
				return (
					<FluxProvider core={core} handle={handle}>
						{live.map((id) => {
							return <Surface key={id} />;
						})}
					</FluxProvider>
				);
			}

			const { rerender } = render(<Host live={["first", "second"]} />);

			expect(state.debugCaptures("jump").size()).toBe(2);

			// Unmount the older sibling; the newer one keeps the action.
			rerender(<Host live={["second"]} />);

			expect(state.debugCaptures("jump").size()).toBe(1);

			core.simulateAction(handle, "jump", true);
			core.update(FRAME_TIME);

			expect(state.pressed("jump")).toBeFalse();

			rerender(<Host live={[]} />);

			expect(state.debugCaptures("jump").size()).toBe(0);
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

			// React-Lua's StrictMode does not double-invoke effects, so the
			// double-mount ordering is driven here with a key remount: the old
			// instance's cleanup and the new instance's setup land in the same
			// commit, exactly as a React 18 StrictMode double-mount would.
			const { rerender } = render(<Host generation="first" />);

			rerender(<Host generation="second" />);

			expect(depths.entries()).toStrictEqual([1, 0, 1]);
			expect(spy).toHaveBeenCalledTimes(2);
			expect(state.debugCaptures("jump").size()).toBe(1);
		});

		it("should read harmlessly after unmount rather than erroring", () => {
			expect.assertions(2);

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

			// The capture is gone, so the reader has no privileged view left:
			// a late read during teardown is harmless, never an error.
			expect(() => token.pressed()).never.toThrow();
			expect(core.getState(handle).pressed("jump")).toBeTrue();
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
				const value = useCaptureAction({ pressed: false }, (token) => token.pressed);
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
