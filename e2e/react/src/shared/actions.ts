import { bool, defineActions, direction2d } from "@flux/core";

export const actions = defineActions({
	fire: bool(),
	jump: bool(),
	move: direction2d(),
});
