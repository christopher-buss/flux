import { bool, defineActions, direction2d } from "@rbxts/flux";

export const actions = defineActions({
	jump: bool(),
	move: direction2d(),
});
