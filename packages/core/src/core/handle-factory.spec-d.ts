import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import type { InputHandle } from "../types/core";
import type { HandleFactory } from "./handle-factory";
import { createHandleFactory } from "./handle-factory";

describe("createHandleFactory", () => {
	it("should return a HandleFactory", () => {
		expectTypeOf(createHandleFactory()).toEqualTypeOf<HandleFactory>();
	});

	it("should take no arguments", () => {
		expectTypeOf(createHandleFactory).toBeCallableWith();
	});
});

describe("HandleFactory", () => {
	it("should have allocate method returning InputHandle", () => {
		expectTypeOf<HandleFactory["allocate"]>().returns.toEqualTypeOf<InputHandle>();
	});

	it("should have allocate accepting no arguments", () => {
		expectTypeOf<HandleFactory["allocate"]>().toBeCallableWith();
	});
});
