import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import type { BindingLike } from "../types/bindings";
import type { InputPlatform } from "./classify";
import { classifyBinding, getBindingsForPlatform } from "./classify";

describe("classifyBinding", () => {
	it("should accept Enum.KeyCode", () => {
		expectTypeOf(classifyBinding).toBeCallableWith(Enum.KeyCode.Space);
	});

	it("should accept BindingConfig", () => {
		expectTypeOf(classifyBinding).toBeCallableWith({});
	});

	it("should return InputPlatform", () => {
		expectTypeOf(classifyBinding).returns.toEqualTypeOf<InputPlatform>();
	});
});

describe("getBindingsForPlatform", () => {
	it("should accept ReadonlyArray<BindingLike> and InputPlatform", () => {
		expectTypeOf(getBindingsForPlatform).toBeCallableWith(
			[] as ReadonlyArray<BindingLike>,
			"keyboard",
		);
	});

	it("should return ReadonlyArray<BindingLike>", () => {
		expectTypeOf(getBindingsForPlatform).returns.toEqualTypeOf<ReadonlyArray<BindingLike>>();
	});
});
