import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { doubleTap } from "./double-tap";
import { hold } from "./hold";
import type { DoubleTapOptions, HoldOptions, TapOptions } from "./index";
import { tap } from "./tap";
import type { Trigger, TriggerFactory, TriggerState, TriggerType, TypedTrigger } from "./types";
import { blocker, explicit, implicit } from "./wrappers";

describe("doubleTap", () => {
	it("should accept DoubleTapOptions and return TriggerFactory", () => {
		expectTypeOf(doubleTap).parameter(0).toEqualTypeOf<DoubleTapOptions>();
		expectTypeOf(doubleTap).returns.toEqualTypeOf<TriggerFactory>();
	});

	it("should reject missing window field", () => {
		// @ts-expect-error missing required 'window' field
		doubleTap({});
	});
});

describe("hold", () => {
	it("should accept HoldOptions and return TriggerFactory", () => {
		expectTypeOf(hold).parameter(0).toEqualTypeOf<HoldOptions>();
		expectTypeOf(hold).returns.toEqualTypeOf<TriggerFactory>();
	});

	it("should accept optional oneShot field", () => {
		hold({ attempting: 0.1, oneShot: true, threshold: 0.5 });
		hold({ attempting: 0.1, threshold: 0.5 });
	});

	it("should reject missing required fields", () => {
		// @ts-expect-error missing required 'threshold' and 'attempting'
		hold({});
	});
});

describe("tap", () => {
	it("should accept TapOptions and return TriggerFactory", () => {
		expectTypeOf(tap).parameter(0).toEqualTypeOf<TapOptions>();
		expectTypeOf(tap).returns.toEqualTypeOf<TriggerFactory>();
	});

	it("should reject missing threshold", () => {
		// @ts-expect-error missing required 'threshold' field
		tap({});
	});
});

describe("wrappers", () => {
	it("should accept TriggerFactory and return TypedTrigger", () => {
		expectTypeOf(implicit).parameter(0).toEqualTypeOf<TriggerFactory>();
		expectTypeOf(explicit).parameter(0).toEqualTypeOf<TriggerFactory>();
		expectTypeOf(blocker).parameter(0).toEqualTypeOf<TriggerFactory>();
		expectTypeOf(implicit).returns.toEqualTypeOf<TypedTrigger>();
		expectTypeOf(explicit).returns.toEqualTypeOf<TypedTrigger>();
		expectTypeOf(blocker).returns.toEqualTypeOf<TypedTrigger>();
	});

	it("should reject non-factory arguments", () => {
		// @ts-expect-error string is not a TriggerFactory
		implicit("not a trigger");
	});
});

describe("Trigger", () => {
	it("should have update method returning TriggerState", () => {
		expectTypeOf<Trigger["update"]>().returns.toEqualTypeOf<TriggerState>();
	});

	it("should have update accepting magnitude, duration, deltaTime", () => {
		expectTypeOf<Trigger["update"]>().toBeCallableWith(1, 0.5, 0.016);
	});

	it("should have optional reset method", () => {
		expectTypeOf<Trigger["reset"]>().toEqualTypeOf<(() => void) | undefined>();
	});
});

describe("TriggerState", () => {
	it("should be a union of string literals", () => {
		expectTypeOf<TriggerState>().toEqualTypeOf<"canceled" | "none" | "ongoing" | "triggered">();
	});
});

describe("TriggerType", () => {
	it("should be a union of classification strings", () => {
		expectTypeOf<TriggerType>().toEqualTypeOf<"blocker" | "explicit" | "implicit">();
	});
});

describe("TypedTrigger", () => {
	it("should have create and type fields", () => {
		expectTypeOf<TypedTrigger>().toHaveProperty("create");
		expectTypeOf<TypedTrigger>().toHaveProperty("type");
	});

	it("should type create as TriggerFactory", () => {
		expectTypeOf<TypedTrigger["create"]>().toEqualTypeOf<TriggerFactory>();
	});

	it("should type type as TriggerType", () => {
		expectTypeOf<TypedTrigger["type"]>().toEqualTypeOf<TriggerType>();
	});
});
