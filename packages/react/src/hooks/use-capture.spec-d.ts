import type { CaptureToken, InputHandle } from "@rbxts/flux";
import {
	bool,
	createCore,
	defineActions,
	defineContexts,
	direction2d,
	position2d,
} from "@rbxts/flux";
import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { createFluxReact } from "../create-flux-react";

const actions = defineActions({
	jump: bool(),
	look: position2d(),
	move: direction2d(),
});

const contexts = defineContexts({
	gameplay: { bindings: {}, priority: 0 },
});

// eslint-disable-next-line unused-imports/no-unused-vars -- keeps runtime imports active
const core = createCore({ actions, contexts });
const flux = createFluxReact<typeof actions, keyof typeof contexts>();
const INVALID = "nonexistent";

/** A capture token for the Bool action. */
type JumpToken = CaptureToken<typeof actions, "jump">;

/** A capture token for the Direction2D action. */
type MoveToken = CaptureToken<typeof actions, "move">;

/**
 * Whether a read is present on a token's surface.
 *
 * @template Token - The token type under test.
 * @template Read - The read name to look for.
 */
type Has<Token, Read extends string> = Read extends keyof Token ? true : false;

describe("FluxUseCapture", () => {
	const handle = {} as InputHandle;

	describe("single-arg overload", () => {
		it("should return a token narrowed to the captured action", () => {
			expectTypeOf(flux.useCapture("jump")).toEqualTypeOf<
				CaptureToken<typeof actions, "jump">
			>();
			expectTypeOf(flux.useCapture("move")).toEqualTypeOf<
				CaptureToken<typeof actions, "move">
			>();
		});

		it("should expose the reads of the captured action's kind", () => {
			expectTypeOf(flux.useCapture("jump").pressed()).toEqualTypeOf<boolean>();
			expectTypeOf(flux.useCapture("jump").getState()).toEqualTypeOf<boolean>();
			expectTypeOf(flux.useCapture("move").direction2d()).toEqualTypeOf<Vector2>();
			expectTypeOf(flux.useCapture("look").position2d()).toEqualTypeOf<Vector2>();
		});

		it("should expose the kind-agnostic reads on every token", () => {
			expectTypeOf(flux.useCapture("jump").canceled()).toEqualTypeOf<boolean>();
			expectTypeOf(flux.useCapture("jump").claim()).toEqualTypeOf<boolean>();
			expectTypeOf<Has<JumpToken, "release">>().toEqualTypeOf<true>();
		});

		it("should not expose reads belonging to another action kind", () => {
			expectTypeOf<Has<JumpToken, "direction2d">>().toEqualTypeOf<false>();
			expectTypeOf<Has<MoveToken, "pressed">>().toEqualTypeOf<false>();
		});

		it("should reject unknown actions", () => {
			// @ts-expect-error unknown action
			flux.useCapture(INVALID);
		});

		it("should not expose raw reads on the token", () => {
			expectTypeOf<Has<JumpToken, "rawPressed">>().toEqualTypeOf<false>();
			expectTypeOf<Has<JumpToken, "rawJustPressed">>().toEqualTypeOf<false>();
		});

		it("should not expose ownership introspection on the token", () => {
			expectTypeOf<Has<JumpToken, "isCaptured">>().toEqualTypeOf<false>();
		});
	});

	describe("two-arg overload", () => {
		it("should return the same narrowed token with an explicit handle", () => {
			expectTypeOf(flux.useCapture(handle, "jump")).toEqualTypeOf<
				CaptureToken<typeof actions, "jump">
			>();
			expectTypeOf(flux.useCapture(handle, "move").direction2d()).toEqualTypeOf<Vector2>();
		});

		it("should reject a non-handle first argument", () => {
			// @ts-expect-error "not-a-handle" is not an action of the map
			flux.useCapture("not-a-handle", "jump");
		});
	});

	describe("call signature", () => {
		it("should reject a missing action", () => {
			// @ts-expect-error missing action argument
			flux.useCapture();
		});
	});
});

describe("FluxUseCaptureAction", () => {
	it("should flow the selector's return type through", () => {
		const token = flux.useCapture("jump");

		expectTypeOf(
			flux.useCaptureAction(token, (owned) => owned.pressed()),
		).toEqualTypeOf<boolean>();
		expectTypeOf(
			flux.useCaptureAction(token, (owned) => owned.currentDuration()),
		).toEqualTypeOf<number>();
		expectTypeOf(
			flux.useCaptureAction(flux.useCapture("move"), (owned) => owned.direction2d()),
		).toEqualTypeOf<Vector2>();
	});

	it("should narrow the selector argument to the token's kind", () => {
		expectTypeOf(
			flux.useCaptureAction(flux.useCapture("jump"), (owned) => owned),
		).toEqualTypeOf<JumpToken>();
	});

	it("should reject a value that is not a capture token", () => {
		// @ts-expect-error a plain object is not a capture token
		flux.useCaptureAction({ pressed: false }, (owned) => owned.pressed);
	});

	it("should reject a missing selector", () => {
		// @ts-expect-error missing selector
		flux.useCaptureAction(flux.useCapture("jump"));
	});
});
