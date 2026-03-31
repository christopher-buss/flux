import { describe, expect, it } from "@rbxts/jest-globals";
import { fromPartial } from "@rbxts/jest-utils";
import RegExp from "@rbxts/regexp";

import { HandleError } from "../errors/handle-error";
import type { ActionMap } from "../types/actions";
import type { ContextConfig } from "../types/contexts";
import type { InputHandle } from "../types/core";
import { createHandleFactory } from "./handle-factory";
import type { HandleData } from "./handle-lifecycle";
import {
	getHandleData,
	registerHandle,
	registerHandleAs,
	subscribeHandle,
	subscribeHandleAs,
} from "./handle-lifecycle";

const TEST_ACTIONS = {
	jump: { type: "Bool" as const },
	move: { type: "Direction2D" as const },
} satisfies ActionMap;

const TEST_CONTEXTS = {
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.Space],
			move: [Enum.KeyCode.W],
		},
		priority: 0,
	},
} satisfies Record<string, ContextConfig>;

function createOptions() {
	return {
		actions: TEST_ACTIONS,
		contextNames: ["gameplay"],
		contexts: TEST_CONTEXTS,
		handles: new Map<InputHandle, HandleData<typeof TEST_ACTIONS>>(),
		parent: new Instance("Folder"),
	};
}

describe("registerHandle", () => {
	it("should allocate handle via factory and store data", () => {
		expect.assertions(2);

		const factory = createHandleFactory();
		const options = createOptions();
		const handle = registerHandle(factory, options);

		expect(handle).toBe(0);
		expect(options.handles.has(handle)).toBeTrue();
	});

	it("should create action state for each action", () => {
		expect.assertions(2);

		const factory = createHandleFactory();
		const options = createOptions();
		const handle = registerHandle(factory, options);
		const data = options.handles.get(handle)!;

		expect(data.publicState.pressed("jump")).toBeFalse();
		expect(data.publicState.direction2d("move")).toBe(Vector2.zero);
	});

	it("should track active contexts", () => {
		expect.assertions(1);

		const factory = createHandleFactory();
		const options = createOptions();
		const handle = registerHandle(factory, options);
		const data = options.handles.get(handle)!;

		expect(data.activeContexts.has("gameplay")).toBeTrue();
	});
});

describe("registerHandleAs", () => {
	it("should store data under provided handle", () => {
		expect.assertions(1);

		const handle = fromPartial<InputHandle>(42);
		const options = createOptions();
		registerHandleAs(handle, options);

		expect(options.handles.has(handle)).toBeTrue();
	});

	it("should throw HandleError on duplicate handle", () => {
		expect.assertions(1);

		const handle = fromPartial<InputHandle>(42);
		const options = createOptions();
		registerHandleAs(handle, options);
		const duplicate = () => {
			registerHandleAs(handle, options);
		};

		expect(duplicate).toThrowWithMessage(HandleError, RegExp("handle already registered"));
	});

	it("should create action state for each action", () => {
		expect.assertions(1);

		const handle = fromPartial<InputHandle>(42);
		const options = createOptions();
		registerHandleAs(handle, options);
		const data = options.handles.get(handle)!;

		expect(data.publicState.pressed("jump")).toBeFalse();
	});
});

describe("subscribeHandle", () => {
	it("should allocate handle and return cancel function", () => {
		expect.assertions(2);

		const factory = createHandleFactory();
		const parent = new Instance("Folder");
		const options = {
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			handles: new Map<InputHandle, HandleData<typeof TEST_ACTIONS>>(),
			parent,
		};
		const [handle, cancel] = subscribeHandle(factory, options);

		expect(options.handles.has(handle)).toBeTrue();
		expect(typeIs(cancel, "function")).toBeTrue();
	});
});

describe("subscribeHandleAs", () => {
	it("should store data under provided handle", () => {
		expect.assertions(1);

		const handle = fromPartial<InputHandle>(42);
		const parent = new Instance("Folder");
		const options = {
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			handles: new Map<InputHandle, HandleData<typeof TEST_ACTIONS>>(),
			parent,
		};
		subscribeHandleAs(handle, options);

		expect(options.handles.has(handle)).toBeTrue();
	});

	it("should throw HandleError on duplicate handle", () => {
		expect.assertions(1);

		const handle = fromPartial<InputHandle>(42);
		const parent = new Instance("Folder");
		const options = {
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			handles: new Map<InputHandle, HandleData<typeof TEST_ACTIONS>>(),
			parent,
		};
		subscribeHandleAs(handle, options);
		const duplicate = () => {
			subscribeHandleAs(handle, options);
		};

		expect(duplicate).toThrowWithMessage(HandleError, RegExp("handle already registered"));
	});

	it("should return cancel function", () => {
		expect.assertions(1);

		const handle = fromPartial<InputHandle>(42);
		const parent = new Instance("Folder");
		const options = {
			actions: TEST_ACTIONS,
			contextNames: ["gameplay"],
			handles: new Map<InputHandle, HandleData<typeof TEST_ACTIONS>>(),
			parent,
		};
		const cancel = subscribeHandleAs(handle, options);

		expect(typeIs(cancel, "function")).toBeTrue();
	});
});

describe("getHandleData", () => {
	it("should return data for registered handle", () => {
		expect.assertions(1);

		const factory = createHandleFactory();
		const options = createOptions();
		const handle = registerHandle(factory, options);
		const data = getHandleData(options.handles, handle);

		expect(data.publicState.pressed("jump")).toBeFalse();
	});

	it("should throw HandleError for unregistered handle", () => {
		expect.assertions(1);

		const handles = new Map<InputHandle, HandleData<typeof TEST_ACTIONS>>();
		const handle = fromPartial<InputHandle>(999);
		const lookup = () => {
			getHandleData(handles, handle);
		};

		expect(lookup).toThrowWithMessage(HandleError, RegExp("handle not registered"));
	});
});
