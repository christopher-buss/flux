import { bool, defineActions, direction2d, hold, implicit } from "@flux/core";

export const actions = defineActions({
	interact: bool({
		triggers: [implicit(hold({ attempting: 0.1, threshold: 0.5 }))],
	}),
	jump: bool(),
	move: direction2d(),
	toggleContext: bool(),
});
