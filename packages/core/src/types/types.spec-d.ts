import { describe, it } from "@rbxts/jest-globals";
import { expectTypeOf } from "@rbxts/jest-utils/type-testing";

import {
	bool,
	defineActions,
	direction1d,
	direction2d,
	direction3d,
	position2d,
} from "../actions/define";
import { createActionState } from "../core/action-state";
import type { AllActions } from "./actions";
import type {
	BindingForAction,
	BindingLike,
	BindingState,
	BoolBindingConfig,
	Direction2dBindingConfig,
} from "./bindings";
import type { FluxCore, InputHandle } from "./core";
import type { ActionState, ActionValue, ActionValueMap } from "./state";

const actions = defineActions({
	aim: position2d(),
	fly: direction3d(),
	jump: bool(),
	move: direction2d(),
	throttle: direction1d(),
});

describe("InputHandle", () => {
	it("should be a branded number type", () => {
		expectTypeOf<InputHandle>().toExtend<number>();
	});

	it("should not be assignable from plain number", () => {
		// @ts-expect-error plain number is not assignable to InputHandle
		const _handle: InputHandle = 42;
	});
});

describe("FluxCore methods", () => {
	it("should have all public methods", () => {
		expectTypeOf<FluxCore>().toHaveProperty("addContext");
		expectTypeOf<FluxCore>().toHaveProperty("destroy");
		expectTypeOf<FluxCore>().toHaveProperty("getContexts");
		expectTypeOf<FluxCore>().toHaveProperty("getState");
		expectTypeOf<FluxCore>().toHaveProperty("hasContext");
		expectTypeOf<FluxCore>().toHaveProperty("loadBindings");
		expectTypeOf<FluxCore>().toHaveProperty("rebind");
		expectTypeOf<FluxCore>().toHaveProperty("rebindAll");
		expectTypeOf<FluxCore>().toHaveProperty("register");
		expectTypeOf<FluxCore>().toHaveProperty("removeContext");
		expectTypeOf<FluxCore>().toHaveProperty("resetAllBindings");
		expectTypeOf<FluxCore>().toHaveProperty("resetBindings");
		expectTypeOf<FluxCore>().toHaveProperty("serializeBindings");
		expectTypeOf<FluxCore>().toHaveProperty("simulateAction");
		expectTypeOf<FluxCore>().toHaveProperty("subscribe");
		expectTypeOf<FluxCore>().toHaveProperty("unregister");
		expectTypeOf<FluxCore>().toHaveProperty("update");
	});
});

describe("FluxCore generics", () => {
	it("should default Contexts to string", () => {
		expectTypeOf<FluxCore["register"]>().toBeCallableWith(new Instance("Folder"), "anything");
	});

	it("should constrain Contexts to provided string union", () => {
		type Narrow = FluxCore<typeof actions, "gameplay" | "ui">;
		expectTypeOf<Narrow["getContexts"]>().returns.toEqualTypeOf<
			ReadonlyArray<"gameplay" | "ui">
		>();
	});

	it("should type getState return with Actions generic", () => {
		type Narrow = FluxCore<typeof actions, "gameplay">;
		expectTypeOf<ReturnType<Narrow["getState"]>>().toEqualTypeOf<ActionState<typeof actions>>();
	});
});

describe("ActionState type-constrained queries", () => {
	it("should constrain pressed/justPressed/justReleased to BoolActions", () => {
		type State = ActionState<typeof actions>;
		expectTypeOf<State["pressed"]>().toBeCallableWith("jump");
		expectTypeOf<State["justPressed"]>().toBeCallableWith("jump");
		expectTypeOf<State["justReleased"]>().toBeCallableWith("jump");
	});

	it("should constrain direction2d to Direction2dActions", () => {
		type State = ActionState<typeof actions>;
		expectTypeOf<State["direction2d"]>().toBeCallableWith("move");
		expectTypeOf<State["direction2d"]>().returns.toEqualTypeOf<Vector2>();
	});

	it("should constrain axis1d to Direction1dActions", () => {
		type State = ActionState<typeof actions>;
		expectTypeOf<State["axis1d"]>().toBeCallableWith("throttle");
		expectTypeOf<State["axis1d"]>().returns.toEqualTypeOf<number>();
	});

	it("should constrain axis3d to Direction3dActions", () => {
		type State = ActionState<typeof actions>;
		expectTypeOf<State["axis3d"]>().toBeCallableWith("fly");
		expectTypeOf<State["axis3d"]>().returns.toEqualTypeOf<Vector3>();
	});

	it("should constrain position2d to ViewportPositionActions", () => {
		type State = ActionState<typeof actions>;
		expectTypeOf<State["position2d"]>().toBeCallableWith("aim");
		expectTypeOf<State["position2d"]>().returns.toEqualTypeOf<Vector2>();
	});
});

describe("ActionState generic queries", () => {
	it("should allow any action for triggered/canceled/ongoing", () => {
		type State = ActionState<typeof actions>;
		expectTypeOf<State["triggered"]>().toBeCallableWith("jump");
		expectTypeOf<State["triggered"]>().toBeCallableWith("move");
		expectTypeOf<State["canceled"]>().toBeCallableWith("throttle");
		expectTypeOf<State["ongoing"]>().toBeCallableWith("fly");
	});

	it("should return typed value from getState", () => {
		const [state] = createActionState(actions);
		expectTypeOf(state.getState("jump")).toEqualTypeOf<boolean>();
		expectTypeOf(state.getState("move")).toEqualTypeOf<Vector2>();
		expectTypeOf(state.getState("throttle")).toEqualTypeOf<number>();
		expectTypeOf(state.getState("fly")).toEqualTypeOf<Vector3>();
		expectTypeOf(state.getState("aim")).toEqualTypeOf<Vector2>();
	});

	it("should default to string for AllActions methods", () => {
		type Default = ActionState;
		expectTypeOf<Default["triggered"]>().toBeCallableWith("anything");
	});
});

describe("ActionValue", () => {
	it("should resolve Bool to boolean", () => {
		expectTypeOf<ActionValue<typeof actions, "jump">>().toEqualTypeOf<boolean>();
	});

	it("should resolve Direction2D to Vector2", () => {
		expectTypeOf<ActionValue<typeof actions, "move">>().toEqualTypeOf<Vector2>();
	});

	it("should resolve Direction1D to number", () => {
		expectTypeOf<ActionValue<typeof actions, "throttle">>().toEqualTypeOf<number>();
	});

	it("should resolve Direction3D to Vector3", () => {
		expectTypeOf<ActionValue<typeof actions, "fly">>().toEqualTypeOf<Vector3>();
	});

	it("should resolve ViewportPosition to Vector2", () => {
		expectTypeOf<ActionValue<typeof actions, "aim">>().toEqualTypeOf<Vector2>();
	});
});

describe("ActionValueMap", () => {
	it("should map each ActionType to its runtime type", () => {
		expectTypeOf<ActionValueMap["Bool"]>().toEqualTypeOf<boolean>();
		expectTypeOf<ActionValueMap["Direction1D"]>().toEqualTypeOf<number>();
		expectTypeOf<ActionValueMap["Direction2D"]>().toEqualTypeOf<Vector2>();
		expectTypeOf<ActionValueMap["Direction3D"]>().toEqualTypeOf<Vector3>();
		expectTypeOf<ActionValueMap["ViewportPosition"]>().toEqualTypeOf<Vector2>();
	});
});

describe("BindingLike", () => {
	it("should accept KeyCode", () => {
		expectTypeOf<Enum.KeyCode>().toExtend<BindingLike>();
	});

	it("should reject UserInputType", () => {
		expectTypeOf<Enum.UserInputType>().not.toExtend<BindingLike>();
	});

	it("should accept Direction2dBindingConfig", () => {
		expectTypeOf<Direction2dBindingConfig>().toExtend<BindingLike>();
	});

	it("should accept BoolBindingConfig", () => {
		expectTypeOf<BoolBindingConfig>().toExtend<BindingLike>();
	});

	it("should reject plain string", () => {
		// @ts-expect-error string is not a BindingLike
		const _binding: BindingLike = "Space";
	});
});

describe("BindingForAction", () => {
	it("should resolve Bool to KeyCode | BoolBindingConfig", () => {
		expectTypeOf<BoolBindingConfig>().toExtend<BindingForAction<"Bool">>();
		expectTypeOf<Enum.KeyCode>().toExtend<BindingForAction<"Bool">>();
	});

	it("should resolve Direction2D to KeyCode | Direction2dBindingConfig", () => {
		expectTypeOf<Direction2dBindingConfig>().toExtend<BindingForAction<"Direction2D">>();
		expectTypeOf<Enum.KeyCode>().toExtend<BindingForAction<"Direction2D">>();
	});
});

describe("BindingState", () => {
	it("should be a partial record of action names to binding arrays", () => {
		type State = BindingState<typeof actions>;
		expectTypeOf<State>().toEqualTypeOf<
			Partial<Record<AllActions<typeof actions>, ReadonlyArray<BindingLike>>>
		>();
	});

	it("should allow partial binding maps", () => {
		const partial: BindingState<typeof actions> = {
			jump: [Enum.KeyCode.Space],
		};
		expectTypeOf(partial).toExtend<BindingState<typeof actions>>();
	});

	it("should default to string keys without type parameter", () => {
		type Default = BindingState;
		expectTypeOf<Default>().toEqualTypeOf<
			Partial<Record<string, ReadonlyArray<BindingLike>>>
		>();
	});
});
