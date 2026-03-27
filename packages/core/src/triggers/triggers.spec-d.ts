import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { doubleTap } from "./double-tap";
import { hold } from "./hold";
import type { DoubleTapOptions, HoldOptions, TapOptions } from "./index";
import { tap } from "./tap";
import type { Trigger, TriggerState, TriggerType, TypedTrigger } from "./types";
import { blocker, explicit, implicit } from "./wrappers";

describe("doubleTap", () => {
	it("should accept DoubleTapOptions and return Trigger", () => {
		expectTypeOf(doubleTap).parameter(0).toEqualTypeOf<DoubleTapOptions>();
		expectTypeOf(doubleTap).returns.toEqualTypeOf<Trigger>();
	});

	it("should reject missing window field", () => {
		// @ts-expect-error missing required 'window' field
		doubleTap({});
	});
});

describe("hold", () => {
	it("should accept HoldOptions and return Trigger", () => {
		expectTypeOf(hold).parameter(0).toEqualTypeOf<HoldOptions>();
		expectTypeOf(hold).returns.toEqualTypeOf<Trigger>();
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
	it("should accept TapOptions and return Trigger", () => {
		expectTypeOf(tap).parameter(0).toEqualTypeOf<TapOptions>();
		expectTypeOf(tap).returns.toEqualTypeOf<Trigger>();
	});

	it("should reject missing threshold", () => {
		// @ts-expect-error missing required 'threshold' field
		tap({});
	});
});

describe("wrappers", () => {
	it("should accept Trigger and return TypedTrigger", () => {
		expectTypeOf(implicit).parameter(0).toEqualTypeOf<Trigger>();
		expectTypeOf(explicit).parameter(0).toEqualTypeOf<Trigger>();
		expectTypeOf(blocker).parameter(0).toEqualTypeOf<Trigger>();
		expectTypeOf(implicit).returns.toEqualTypeOf<TypedTrigger>();
		expectTypeOf(explicit).returns.toEqualTypeOf<TypedTrigger>();
		expectTypeOf(blocker).returns.toEqualTypeOf<TypedTrigger>();
	});

	it("should reject non-Trigger arguments", () => {
		// @ts-expect-error string is not a Trigger
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
	it("should have trigger and type fields", () => {
		expectTypeOf<TypedTrigger>().toHaveProperty("trigger");
		expectTypeOf<TypedTrigger>().toHaveProperty("type");
	});

	it("should type trigger as Trigger", () => {
		expectTypeOf<TypedTrigger["trigger"]>().toEqualTypeOf<Trigger>();
	});

	it("should type type as TriggerType", () => {
		expectTypeOf<TypedTrigger["type"]>().toEqualTypeOf<TriggerType>();
	});
});
