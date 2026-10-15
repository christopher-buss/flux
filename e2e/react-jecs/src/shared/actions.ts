import { bool, defineActions, direction2d } from "@rbxts/flux";

export const actions = defineActions({
	confirm: bool(),
	jump: bool(),
	move: direction2d(),
	swapJump: bool(),
	toggleMenu: bool(),
});
