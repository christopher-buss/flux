import { describe, expect, it } from "@rbxts/jest-globals";

import {
	action,
	bool,
	defineActions,
	direction1d,
	direction2d,
	direction3d,
	position2d,
} from "./define";

describe("defineActions", () => {
	it("should return the same actions object", () => {
		expect.assertions(2);

		const actions = defineActions({
			jump: action({ type: "Bool" }),
			move: action({ type: "Direction2D" }),
		});

		expect(actions.jump.type).toBe("Bool");
		expect(actions.move.type).toBe("Direction2D");
	});

	it("should work with convenience wrappers", () => {
		expect.assertions(3);

		const actions = defineActions({
			aim: position2d(),
			jump: bool(),
			move: direction2d(),
		});

		expect(actions.jump.type).toBe("Bool");
		expect(actions.move.type).toBe("Direction2D");
		expect(actions.aim.type).toBe("ViewportPosition");
	});
});

describe("action", () => {
	it("should preserve the type literal", () => {
		expect.assertions(1);

		const config = action({ type: "Bool" });

		expect(config.type).toBe("Bool");
	});

	it("should accept optional fields", () => {
		expect.assertions(2);

		const config = action({
			description: "Jump action",
			enabled: false,
			type: "Bool",
		});

		expect(config.description).toBe("Jump action");
		expect(config.enabled).toBeFalse();
	});
});

describe("convenience wrappers", () => {
	it("should create Bool config with bool", () => {
		expect.assertions(2);

		expect(bool().type).toBe("Bool");
		expect(bool({ description: "Fire" }).description).toBe("Fire");
	});

	it("should create Direction1D config with direction1d", () => {
		expect.assertions(1);

		expect(direction1d().type).toBe("Direction1D");
	});

	it("should create Direction2D config with direction2d", () => {
		expect.assertions(1);

		expect(direction2d().type).toBe("Direction2D");
	});

	it("should create Direction3D config with direction3d", () => {
		expect.assertions(1);

		expect(direction3d().type).toBe("Direction3D");
	});

	it("should create ViewportPosition config with position2d", () => {
		expect.assertions(1);

		expect(position2d().type).toBe("ViewportPosition");
	});
});
