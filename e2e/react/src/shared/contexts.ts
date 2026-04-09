import { defineContexts } from "@flux/core";

export const contexts = defineContexts({
	gameplay: {
		bindings: {
			fire: [Enum.KeyCode.MouseRightButton],
			jump: [Enum.KeyCode.Space],
			move: [
				{
					down: Enum.KeyCode.S,
					left: Enum.KeyCode.A,
					right: Enum.KeyCode.D,
					up: Enum.KeyCode.W,
				},
			],
		},
		priority: 0,
	},
});
