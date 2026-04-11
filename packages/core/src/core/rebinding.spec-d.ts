import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { bool, defineActions, direction2d } from "../actions/define";
import { defineContexts } from "../contexts/define";
import type { BindingState } from "../types/bindings";
import type { InputHandle } from "../types/core";
import { createCore } from "./create-core";

const actions = defineActions({
	jump: bool(),
	move: direction2d(),
});

const contexts = defineContexts({
	gameplay: { bindings: {}, priority: 0 },
	ui: { bindings: {}, priority: 10, sink: true },
});

const core = createCore({ actions, contexts });
const INVALID = "nonexistent";

describe("rebind", () => {
	it("should constrain action to AllActions", () => {
		const handle = {} as InputHandle;
		expectTypeOf<typeof core.rebind>().toBeCallableWith(handle, "jump", []);
	});

	it("should accept correct binding config for action type", () => {
		const handle = {} as InputHandle;
		core.rebind(handle, "move", [
			{
				down: Enum.KeyCode.S,
				left: Enum.KeyCode.A,
				right: Enum.KeyCode.D,
				up: Enum.KeyCode.W,
			},
		]);
		core.rebind(handle, "jump", [Enum.KeyCode.Space]);
	});

	it("should reject invalid action on rebind", () => {
		const handle = {} as InputHandle;
		// @ts-expect-error unknown action
		core.rebind(handle, INVALID, []);
	});
});

describe("rebindAll", () => {
	it("should accept typed BindingState", () => {
		const handle = {} as InputHandle;
		const bindings: BindingState<typeof actions> = {};
		expectTypeOf<typeof core.rebindAll>().toBeCallableWith(handle, bindings);
	});
});

describe("resetBindings", () => {
	it("should constrain action to AllActions", () => {
		const handle = {} as InputHandle;
		expectTypeOf<typeof core.resetBindings>().toBeCallableWith(handle, "move");
	});

	it("should reject invalid action on resetBindings", () => {
		const handle = {} as InputHandle;
		// @ts-expect-error unknown action
		core.resetBindings(handle, INVALID);
	});
});

describe("resetAllBindings", () => {
	it("should return void", () => {
		expectTypeOf<typeof core.resetAllBindings>().returns.toEqualTypeOf<void>();
	});
});

describe("loadBindings", () => {
	it("should accept typed BindingState", () => {
		const handle = {} as InputHandle;
		const bindings: BindingState<typeof actions> = {};
		expectTypeOf<typeof core.loadBindings>().toBeCallableWith(handle, bindings);
	});
});

describe("serializeBindings", () => {
	it("should return typed BindingState", () => {
		const handle = {} as InputHandle;
		expectTypeOf(core.serializeBindings(handle)).toEqualTypeOf<BindingState<typeof actions>>();
	});
});
