import { describe, it } from "@rbxts/jest-globals";
import { fromAny, fromPartial } from "@rbxts/jest-utils";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import { bool, defineActions, direction2d } from "../actions/define";
import type { InputPlatform } from "../bindings/classify";
import { defineContexts } from "../contexts/define";
import type { BindingLike, BindingOrigin, BindingState } from "../types/bindings";
import type { InputHandle } from "../types/core";
import { createCore } from "./create-core";
import type { PLATFORM_ORDER } from "./platform-overrides";

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
		const handle = fromPartial<InputHandle>(fromAny(1));
		expectTypeOf<typeof core.rebind>().toBeCallableWith(handle, "jump", []);
	});

	it("should accept correct binding config for action type", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
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
		const handle = fromPartial<InputHandle>(fromAny(1));
		// @ts-expect-error unknown action
		core.rebind(handle, INVALID, []);
	});
});

describe("rebindAll", () => {
	it("should accept typed BindingState", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		const bindings: BindingState<typeof actions> = {};
		expectTypeOf<typeof core.rebindAll>().toBeCallableWith(handle, bindings);
	});
});

describe("resetBindings", () => {
	it("should constrain action to AllActions", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		expectTypeOf<typeof core.resetBindings>().toBeCallableWith(handle, "move");
	});

	it("should reject invalid action on resetBindings", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
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
		const handle = fromPartial<InputHandle>(fromAny(1));
		const bindings: BindingState<typeof actions> = {};
		expectTypeOf<typeof core.loadBindings>().toBeCallableWith(handle, bindings);
	});
});

describe("serializeBindings", () => {
	it("should return typed BindingState", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		expectTypeOf(core.serializeBindings(handle)).toEqualTypeOf<BindingState<typeof actions>>();
	});
});

describe("rebindForPlatform", () => {
	it("should accept keyboard and gamepad", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		expectTypeOf<typeof core.rebindForPlatform>().toBeCallableWith(handle, "jump", "keyboard", [
			Enum.KeyCode.Space,
		]);
		expectTypeOf<typeof core.rebindForPlatform>().toBeCallableWith(handle, "jump", "gamepad", [
			Enum.KeyCode.ButtonA,
		]);
	});

	it("should reject touch", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		// @ts-expect-error touch cannot be rebound per platform
		core.rebindForPlatform(handle, "jump", "touch", []);
	});

	it("should reject invalid action", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		// @ts-expect-error unknown action
		core.rebindForPlatform(handle, INVALID, "keyboard", []);
	});
});

describe("resetBindingsForPlatform", () => {
	it("should accept keyboard and gamepad", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		expectTypeOf<typeof core.resetBindingsForPlatform>().toBeCallableWith(
			handle,
			"move",
			"keyboard",
		);
	});

	it("should reject touch", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		// @ts-expect-error touch cannot be reset per platform
		core.resetBindingsForPlatform(handle, "jump", "touch");
	});
});

describe("resetAllBindingsForPlatform", () => {
	it("should accept a writable platform", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		expectTypeOf<typeof core.resetAllBindingsForPlatform>().toBeCallableWith(handle, "gamepad");
	});

	it("should reject the touch platform", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		// @ts-expect-error touch cannot be reset per platform
		core.resetAllBindingsForPlatform(handle, "touch");
	});
});

describe("getBindingOrigin", () => {
	it("should return a BindingOrigin", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		expectTypeOf(
			core.getBindingOrigin(handle, "jump", "keyboard"),
		).toEqualTypeOf<BindingOrigin>();
	});

	it("should accept touch, which cannot be written per platform", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		expectTypeOf<typeof core.getBindingOrigin>().toBeCallableWith(handle, "jump", "touch");
	});

	it("should accept an optional context", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		expectTypeOf<typeof core.getBindingOrigin>().toBeCallableWith(
			handle,
			"jump",
			"gamepad",
			"gameplay",
		);
	});

	it("should reject an unknown action", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		// @ts-expect-error unknown action
		core.getBindingOrigin(handle, INVALID, "keyboard");
	});

	it("should reject an unknown platform", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		// @ts-expect-error unknown platform
		core.getBindingOrigin(handle, "jump", "mouse");
	});
});

describe("getBindingsForPlatform", () => {
	it("should return the bindings for one platform", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		expectTypeOf(core.getBindingsForPlatform(handle, "jump", "touch")).toEqualTypeOf<
			ReadonlyArray<BindingLike>
		>();
	});

	it("should reject an unknown context", () => {
		const handle = fromPartial<InputHandle>(fromAny(1));
		// @ts-expect-error unknown context
		core.getBindingsForPlatform(handle, "jump", "keyboard", INVALID);
	});
});

describe("PLATFORM_ORDER", () => {
	it("should list every input platform", () => {
		expectTypeOf<(typeof PLATFORM_ORDER)[number]>().toEqualTypeOf<InputPlatform>();
	});
});
