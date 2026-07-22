import { describe, expect, it, jest } from "@rbxts/jest-globals";

import type { InputPlatform } from "../bindings/classify";
import type { BindingLike } from "../types/bindings";
import type { PlatformOverrides } from "./platform-overrides";
import {
	bucketByPlatform,
	composeBindings,
	findPlatformBucket,
	PLATFORM_ORDER,
	resolvePlatformBucket,
} from "./platform-overrides";

/** A touch binding needing no `GuiButton`, so the spec stays instance-free. */
const TOUCH_BINDING: BindingLike = { pointerIndex: 1 };

/** A type-legal config naming no input source at all. */
const SOURCELESS_BINDING: BindingLike = { pressedThreshold: 0.5 };

/**
 * Reads a platform's bindings from a bucketed map.
 * @param byPlatform - The bucketed bindings.
 * @param platform - The platform to read.
 * @returns That platform's bindings, empty when it has none.
 */
function bucketFor(
	byPlatform: ReturnType<typeof bucketByPlatform>,
	platform: InputPlatform,
): ReadonlyArray<BindingLike> {
	return byPlatform.get(platform) ?? [];
}

describe("platform order", () => {
	it("should list every platform in a fixed order", () => {
		expect.assertions(1);

		expect(PLATFORM_ORDER).toStrictEqual(["keyboard", "gamepad", "touch"]);
	});

	it("should decide composition order rather than authored order", () => {
		expect.assertions(1);

		// Authored gamepad-first; keyboard still composes first.
		const overrides: PlatformOverrides = new Map([
			["gamepad", [Enum.KeyCode.ButtonY]],
			["keyboard", [Enum.KeyCode.F]],
			["touch", [TOUCH_BINDING]],
		]);

		expect(composeBindings(overrides, () => [])).toStrictEqual([
			Enum.KeyCode.F,
			Enum.KeyCode.ButtonY,
			TOUCH_BINDING,
		]);
	});
});

describe("bucketByPlatform", () => {
	it("should group bindings by the platform each one targets", () => {
		expect.assertions(3);

		const byPlatform = bucketByPlatform([
			Enum.KeyCode.Space,
			Enum.KeyCode.ButtonA,
			TOUCH_BINDING,
		]);

		expect(bucketFor(byPlatform, "keyboard")).toStrictEqual([Enum.KeyCode.Space]);
		expect(bucketFor(byPlatform, "gamepad")).toStrictEqual([Enum.KeyCode.ButtonA]);
		expect(bucketFor(byPlatform, "touch")).toStrictEqual([TOUCH_BINDING]);
	});

	it("should keep several bindings for one platform in source order", () => {
		expect.assertions(1);

		const byPlatform = bucketByPlatform([Enum.KeyCode.G, Enum.KeyCode.ButtonY, Enum.KeyCode.F]);

		expect(bucketFor(byPlatform, "keyboard")).toStrictEqual([Enum.KeyCode.G, Enum.KeyCode.F]);
	});

	it("should omit a platform no binding targets", () => {
		expect.assertions(1);

		const byPlatform = bucketByPlatform([Enum.KeyCode.Space]);

		expect(byPlatform.get("gamepad")).toBeUndefined();
	});

	it("should bucket a sourceless config as keyboard", () => {
		expect.assertions(1);

		const byPlatform = bucketByPlatform([SOURCELESS_BINDING]);

		expect(bucketFor(byPlatform, "keyboard")).toStrictEqual([SOURCELESS_BINDING]);
	});

	it("should return an empty map for no bindings", () => {
		expect.assertions(1);

		expect(bucketByPlatform([]).isEmpty()).toBeTrue();
	});
});

describe("findPlatformBucket", () => {
	it("should return undefined when the action has no overrides at all", () => {
		expect.assertions(1);

		expect(findPlatformBucket(undefined, "keyboard")).toBeUndefined();
	});

	it("should return undefined for a platform whose bucket is absent", () => {
		expect.assertions(1);

		const overrides: PlatformOverrides = new Map([["gamepad", [Enum.KeyCode.ButtonY]]]);

		expect(findPlatformBucket(overrides, "keyboard")).toBeUndefined();
	});

	it("should return an empty bucket rather than treating it as absent", () => {
		expect.assertions(1);

		const overrides: PlatformOverrides = new Map([["gamepad", []]]);

		expect(findPlatformBucket(overrides, "gamepad")).toStrictEqual([]);
	});
});

describe("resolvePlatformBucket", () => {
	it("should prefer the override bucket over the declared bindings", () => {
		expect.assertions(1);

		const overrides: PlatformOverrides = new Map([["gamepad", [Enum.KeyCode.ButtonY]]]);

		const result = resolvePlatformBucket({
			declaredFor: () => [Enum.KeyCode.ButtonA],
			overrides,
			platform: "gamepad",
		});

		expect(result).toStrictEqual([Enum.KeyCode.ButtonY]);
	});

	it("should treat an empty bucket as a deliberate unbind", () => {
		expect.assertions(1);

		const overrides: PlatformOverrides = new Map([["gamepad", []]]);

		const result = resolvePlatformBucket({
			declaredFor: () => [Enum.KeyCode.ButtonA],
			overrides,
			platform: "gamepad",
		});

		expect(result).toStrictEqual([]);
	});

	it("should fall through to the declared bindings when the bucket is absent", () => {
		expect.assertions(1);

		const result = resolvePlatformBucket({
			declaredFor: () => [Enum.KeyCode.Space],
			overrides: undefined,
			platform: "keyboard",
		});

		expect(result).toStrictEqual([Enum.KeyCode.Space]);
	});
});

describe("composeBindings", () => {
	it("should return the declared defaults by identity when nothing is overridden", () => {
		expect.assertions(1);

		const defaults: ReadonlyArray<BindingLike> = [Enum.KeyCode.Space, Enum.KeyCode.ButtonA];

		expect(composeBindings(undefined, () => defaults)).toBe(defaults);
	});

	it("should allocate a fresh list once any platform is overridden", () => {
		expect.assertions(2);

		const defaults: ReadonlyArray<BindingLike> = [Enum.KeyCode.Space];
		const overrides: PlatformOverrides = new Map([["gamepad", []]]);

		const result = composeBindings(overrides, () => defaults);

		expect(result).toStrictEqual(defaults);
		expect(result).never.toBe(defaults);
	});

	it("should never read the defaults when every platform is overridden", () => {
		expect.assertions(1);

		const [resolveDefaults, resolve] = jest.fn<() => ReadonlyArray<BindingLike>>();
		resolveDefaults.mockReturnValue([Enum.KeyCode.Space]);
		const overrides: PlatformOverrides = new Map([
			["gamepad", [Enum.KeyCode.ButtonY]],
			["keyboard", [Enum.KeyCode.F]],
			["touch", []],
		]);

		composeBindings(overrides, resolve);

		expect(resolveDefaults).never.toHaveBeenCalled();
	});

	it("should read the defaults exactly once when a platform falls through", () => {
		expect.assertions(1);

		const [resolveDefaults, resolve] = jest.fn<() => ReadonlyArray<BindingLike>>();
		resolveDefaults.mockReturnValue([Enum.KeyCode.Space, TOUCH_BINDING]);
		const overrides: PlatformOverrides = new Map([["gamepad", [Enum.KeyCode.ButtonY]]]);

		composeBindings(overrides, resolve);

		expect(resolveDefaults).toHaveBeenCalledTimes(1);
	});

	it("should keep the defaults for a platform with no bucket", () => {
		expect.assertions(1);

		const overrides: PlatformOverrides = new Map([["gamepad", [Enum.KeyCode.ButtonY]]]);

		const result = composeBindings(overrides, () => [Enum.KeyCode.Space, Enum.KeyCode.ButtonA]);

		expect(result).toStrictEqual([Enum.KeyCode.Space, Enum.KeyCode.ButtonY]);
	});

	it("should drop a platform whose bucket is present but empty", () => {
		expect.assertions(1);

		const overrides: PlatformOverrides = new Map([["gamepad", []]]);

		const result = composeBindings(overrides, () => [Enum.KeyCode.Space, Enum.KeyCode.ButtonA]);

		expect(result).toStrictEqual([Enum.KeyCode.Space]);
	});

	it("should distinguish an emptied bucket from an absent one", () => {
		expect.assertions(2);

		const defaults = (): ReadonlyArray<BindingLike> => [
			Enum.KeyCode.Space,
			Enum.KeyCode.ButtonA,
		];
		const emptied: PlatformOverrides = new Map([["gamepad", []]]);
		const absent: PlatformOverrides = new Map([["keyboard", [Enum.KeyCode.Space]]]);

		expect(composeBindings(emptied, defaults)).toStrictEqual([Enum.KeyCode.Space]);
		expect(composeBindings(absent, defaults)).toStrictEqual([
			Enum.KeyCode.Space,
			Enum.KeyCode.ButtonA,
		]);
	});

	it("should keep source order within one platform", () => {
		expect.assertions(1);

		const overrides: PlatformOverrides = new Map([
			["keyboard", [Enum.KeyCode.G, Enum.KeyCode.F]],
		]);

		const result = composeBindings(overrides, () => []);

		expect(result).toStrictEqual([Enum.KeyCode.G, Enum.KeyCode.F]);
	});

	it("should classify the defaults so each platform takes only its own", () => {
		expect.assertions(1);

		const overrides: PlatformOverrides = new Map([["keyboard", [Enum.KeyCode.F]]]);

		const result = composeBindings(overrides, () => [
			Enum.KeyCode.Space,
			Enum.KeyCode.ButtonA,
			TOUCH_BINDING,
		]);

		expect(result).toStrictEqual([Enum.KeyCode.F, Enum.KeyCode.ButtonA, TOUCH_BINDING]);
	});
});
