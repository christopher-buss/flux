import { describe, expect, it } from "@rbxts/jest-globals";

import { ContextError } from "./context-error";
import { Error, filterStack } from "./error";
import { FluxError } from "./flux-error";
import { HandleError } from "./handle-error";

describe("error", () => {
	it("should set default name to Error", () => {
		expect.assertions(1);

		const thrown = new Error();

		expect(thrown.name).toBe("Error");
	});

	it("should set message from constructor argument", () => {
		expect.assertions(1);

		const thrown = new Error("something broke");

		expect(thrown.message).toBe("something broke");
	});

	it("should default message to empty string", () => {
		expect.assertions(1);

		const thrown = new Error();

		expect(thrown.message).toBe("");
	});

	it("should capture stack trace on construction", () => {
		expect.assertions(1);

		const thrown = new Error("test");

		expect(thrown.stack).toInclude("Error: test");
	});

	describe("toString", () => {
		it("should format as name and message", () => {
			expect.assertions(1);

			const thrown = new Error("something broke");

			expect(thrown.toString()).toBe("Error: something broke");
		});

		it("should return only name when message is empty", () => {
			expect.assertions(1);

			const thrown = new Error();

			expect(thrown.toString()).toBe("Error");
		});

		it("should support tostring on the class and instance", () => {
			expect.assertions(2);

			const thrown = new Error("something broke");

			expect(tostring(Error)).toBe("Error");
			expect(tostring(thrown)).toBe("Error: something broke");
		});
	});

	describe("captureStackTrace", () => {
		it("should replace stack on target", () => {
			expect.assertions(1);

			const thrown = new Error("test");
			Error.captureStackTrace(thrown);

			expect(thrown.stack).toInclude("Error: test");
		});

		it("should filter stack frames above the given function", () => {
			expect.assertions(2);

			function outerWrapper(): Error {
				return innerCaller();
			}

			function innerCaller(): Error {
				const thrown = new Error("filtered");
				Error.captureStackTrace(thrown, outerWrapper);
				return thrown;
			}

			const thrown = outerWrapper();
			assert(thrown.stack !== undefined);
			const { stack } = thrown;

			expect(stack).toInclude("Error: filtered");
			expect(stack).never.toInclude("outerWrapper");
		});

		it("should trim the matched frame via filterStack", () => {
			expect.assertions(1);

			const stack = "top frame\nmock-source:123 function myFunc\nbottom frame";
			const result = filterStack(stack, "mock-source", "myFunc");

			expect(result).toBe("bottom frame");
		});

		it("should return original stack when function name is undefined", () => {
			expect.assertions(1);

			const stack = "top frame\nbottom frame";

			expect(filterStack(stack, "source", undefined)).toBe(stack);
		});

		it("should return original stack when source path is undefined", () => {
			expect.assertions(1);

			const stack = "top frame\nbottom frame";

			expect(filterStack(stack, undefined, "func")).toBe(stack);
		});

		it("should return original stack when pattern has no match", () => {
			expect.assertions(1);

			const stack = "top frame\nbottom frame";
			const result = filterStack(stack, "nonexistent", "noFunc");

			expect(result).toBe(stack);
		});

		it("should preserve stack when function name is unresolvable", () => {
			expect.assertions(1);

			const thrown = new Error("test");
			Error.captureStackTrace(thrown, () => {});

			expect(thrown.stack).toInclude("Error: test");
		});

		it("should return original stack when match has no trailing newline", () => {
			expect.assertions(1);

			const stack = "mock-source:42 function myFunc";
			const result = filterStack(stack, "mock-source", "myFunc");

			expect(result).toBe(stack);
		});
	});

	describe("subclasses", () => {
		it("should support tostring for FluxError", () => {
			expect.assertions(3);

			const thrown = new FluxError("flux broke");

			expect(thrown.name).toBe("FluxError");
			expect(tostring(FluxError)).toBe("FluxError");
			expect(tostring(thrown)).toBe("FluxError: flux broke");
		});

		it("should support tostring for ContextError", () => {
			expect.assertions(4);

			const thrown = new ContextError("bad context", "ui");

			expect(thrown.name).toBe("ContextError");
			expect(thrown.context).toBe("ui");
			expect(tostring(ContextError)).toBe("ContextError");
			expect(tostring(thrown)).toBe("ContextError: bad context");
		});

		it("should support tostring for HandleError", () => {
			expect.assertions(3);

			const thrown = new HandleError("bad handle");

			expect(thrown.name).toBe("HandleError");
			expect(tostring(HandleError)).toBe("HandleError");
			expect(tostring(thrown)).toBe("HandleError: bad handle");
		});
	});
});
